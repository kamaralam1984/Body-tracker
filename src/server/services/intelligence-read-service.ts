import { getPrisma } from "@/server/db/prisma";
import type { TrackingMetricSample } from "@prisma/client";
import {
  engagementOf,
  alignmentQualityOf,
  energyLevelOf,
  fatigueLevelOf,
  drowsinessStatusOf,
  pitchAlignmentScore,
  rollAlignmentScore,
  yawBalanceScore,
  stabilityScoreOf,
  computeActivityQualityScore,
  type EngagementLevel,
  type AlignmentQuality,
  type EnergyLevel,
  type FatigueLevel,
  type DrowsinessStatus,
} from "./intelligence-metrics-service";

/**
 * Read-side queries backing `/api/v1/analytics/{attention,posture,fatigue}*`
 * — turns `TrackingMetricSample`/`TrackingEvent` rows into the exact shapes
 * `src/features/intelligence/lib/intelligence-service.ts` needs, so the
 * dashboard pages see real data with zero page-level changes. Same
 * "deterministic, not AI" convention as `analytics-service.ts`.
 *
 * A brand-new user with zero samples ever gets an honest zero snapshot
 * (nothing to fall back to); a user who tracked yesterday but hasn't yet
 * today gets yesterday's numbers rather than a misleading all-zero "your
 * attention is terrible" card — see `resolveActiveDay`.
 */

export type TrendDirection = "improving" | "stable" | "declining";

const NOTABLE_DELTA_PCT = 2; // below this magnitude, call the trend "stable" — same threshold analytics-service.ts uses

// `focusRecoveryMinutes` needs more longitudinal history (time-from-distraction
// -to-recovery across many sessions) than Phase 1's single-session window
// accumulates — same "clearly labeled estimate" pattern already agreed for
// calorie estimates, not silently fabricated as a precise measurement.
const FOCUS_RECOVERY_MINUTES_ESTIMATE = 8;

// A session longer than this without a break trips `longSessionAlert`.
const LONG_SESSION_MINUTES = 45;

const DAY_MS = 24 * 60 * 60 * 1000;

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value);
}

function trendFrom(current: number, previous: number | null): TrendDirection {
  if (previous === null || previous === 0) return "stable";
  const deltaPct = ((current - previous) / previous) * 100;
  if (deltaPct > NOTABLE_DELTA_PCT) return "improving";
  if (deltaPct < -NOTABLE_DELTA_PCT) return "declining";
  return "stable";
}

function dayBoundsUTC(date: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

function formatHourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour} ${period}`;
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

/** Most recent day (today or earlier) with at least one sample, so a quiet day doesn't read as a zero score. */
async function resolveActiveDay(
  orgId: string,
  userId: string,
): Promise<{ start: Date; end: Date }> {
  const prisma = await getPrisma();
  const today = dayBoundsUTC(new Date());

  const todayCount = await prisma.trackingMetricSample.count({
    where: { orgId, userId, windowStart: { gte: today.start, lt: today.end } },
  });
  if (todayCount > 0) return today;

  const mostRecent = await prisma.trackingMetricSample.findFirst({
    where: { orgId, userId },
    orderBy: { windowStart: "desc" },
  });
  return mostRecent ? dayBoundsUTC(mostRecent.windowStart) : today;
}

async function samplesInRange(
  orgId: string,
  userId: string,
  start: Date,
  end: Date,
): Promise<TrackingMetricSample[]> {
  const prisma = await getPrisma();
  return prisma.trackingMetricSample.findMany({
    where: { orgId, userId, windowStart: { gte: start, lt: end } },
    orderBy: { windowStart: "asc" },
  });
}

async function previousDayAverage(
  orgId: string,
  userId: string,
  activeDayStart: Date,
  metric: (s: TrackingMetricSample) => number,
): Promise<number | null> {
  const previousStart = new Date(activeDayStart.getTime() - DAY_MS);
  const samples = await samplesInRange(orgId, userId, previousStart, activeDayStart);
  if (samples.length === 0) return null;
  return average(samples.map(metric));
}

function peakFocusWindowOf(samples: TrackingMetricSample[]): string {
  if (samples.length === 0) return "Not enough data yet";

  const byHour = new Map<number, number[]>();
  for (const sample of samples) {
    const hour = sample.windowStart.getUTCHours();
    if (!byHour.has(hour)) byHour.set(hour, []);
    byHour.get(hour)!.push(sample.attentionScore);
  }

  let bestHour = 0;
  let bestAvg = -1;
  for (const [hour, scores] of byHour) {
    const avg = average(scores);
    if (avg > bestAvg) {
      bestAvg = avg;
      bestHour = hour;
    }
  }

  return `${formatHourLabel(bestHour)}–${formatHourLabel((bestHour + 1) % 24)}`;
}

// --- Attention ---------------------------------------------------------------

export interface AttentionSnapshotData {
  score: number;
  engagement: EngagementLevel;
  distractionEventsToday: number;
  focusDurationMinutes: number;
  peakFocusWindow: string;
  trend: TrendDirection;
}

export async function getAttentionSnapshot(
  orgId: string,
  userId: string,
): Promise<AttentionSnapshotData> {
  const prisma = await getPrisma();
  const day = await resolveActiveDay(orgId, userId);
  const samples = await samplesInRange(orgId, userId, day.start, day.end);

  const score = round(average(samples.map((s) => s.attentionScore)));

  const focusDurationMinutes = round(
    samples
      .filter((s) => s.attentionScore >= 60)
      .reduce((sum, s) => sum + (s.windowEnd.getTime() - s.windowStart.getTime()) / 60_000, 0),
  );

  const distractionEventsToday = await prisma.trackingEvent.count({
    where: {
      type: "distraction",
      session: { orgId, userId },
      createdAt: { gte: day.start, lt: day.end },
    },
  });

  const previousAvg = await previousDayAverage(orgId, userId, day.start, (s) => s.attentionScore);

  return {
    score,
    engagement: engagementOf(score),
    distractionEventsToday,
    focusDurationMinutes,
    peakFocusWindow: peakFocusWindowOf(samples),
    trend: trendFrom(score, previousAvg),
  };
}

export interface FocusTimelinePointData {
  time: string;
  focusScore: number;
}

export async function getFocusTimeline(
  orgId: string,
  userId: string,
): Promise<FocusTimelinePointData[]> {
  const day = await resolveActiveDay(orgId, userId);
  const samples = await samplesInRange(orgId, userId, day.start, day.end);

  const byHour = new Map<number, number[]>();
  for (const sample of samples) {
    const hour = sample.windowStart.getUTCHours();
    if (!byHour.has(hour)) byHour.set(hour, []);
    byHour.get(hour)!.push(sample.attentionScore);
  }

  return Array.from(byHour.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, scores]) => ({ time: formatHourLabel(hour), focusScore: round(average(scores)) }));
}

export interface DistractionEventData {
  id: string;
  timestamp: string;
  durationSeconds: number;
  label: string;
}

export async function getDistractionEvents(
  orgId: string,
  userId: string,
): Promise<DistractionEventData[]> {
  const prisma = await getPrisma();
  const day = await resolveActiveDay(orgId, userId);

  const events = await prisma.trackingEvent.findMany({
    where: {
      type: "distraction",
      session: { orgId, userId },
      createdAt: { gte: day.start, lt: day.end },
    },
    orderBy: { createdAt: "desc" },
  });

  return events.map((event) => {
    const data = event.data as { durationSeconds?: number } | null;
    return {
      id: event.id,
      timestamp: event.createdAt.toISOString(),
      durationSeconds: data?.durationSeconds ?? 0,
      label: event.message,
    };
  });
}

// --- Posture -------------------------------------------------------------------

export interface PostureSnapshotData {
  score: number;
  shoulderAlignment: AlignmentQuality;
  headAlignment: AlignmentQuality;
  neckPosition: AlignmentQuality;
  bodyBalance: AlignmentQuality;
  stability: number;
  trend: TrendDirection;
  dailyImprovementPercent: number;
}

export async function getPostureSnapshot(
  orgId: string,
  userId: string,
): Promise<PostureSnapshotData> {
  const day = await resolveActiveDay(orgId, userId);
  const samples = await samplesInRange(orgId, userId, day.start, day.end);

  const score = round(average(samples.map((s) => s.postureScore)));
  const avgPitchDev = average(samples.map((s) => s.avgHeadPitchDev));
  const avgRollDev = average(samples.map((s) => s.avgHeadRollDev));
  const avgYawStdDev = average(samples.map((s) => s.yawStdDev));
  const avgOfStdDevs = average(
    samples.map((s) => (s.yawStdDev + s.pitchStdDev + s.rollStdDev) / 3),
  );

  const previousAvg = await previousDayAverage(orgId, userId, day.start, (s) => s.postureScore);
  const dailyImprovementPercent =
    previousAvg && previousAvg > 0 ? Math.round(((score - previousAvg) / previousAvg) * 100) : 0;

  return {
    score,
    headAlignment: alignmentQualityOf(pitchAlignmentScore(avgPitchDev)),
    neckPosition: alignmentQualityOf(pitchAlignmentScore(avgPitchDev)),
    shoulderAlignment: alignmentQualityOf(rollAlignmentScore(avgRollDev)),
    bodyBalance: alignmentQualityOf(yawBalanceScore(avgYawStdDev)),
    stability: stabilityScoreOf(avgOfStdDevs),
    trend: trendFrom(score, previousAvg),
    dailyImprovementPercent,
  };
}

export interface PostureTrendPointData {
  label: string;
  score: number;
}

export async function getPostureTrend(
  orgId: string,
  userId: string,
): Promise<PostureTrendPointData[]> {
  return getDailyTrend(orgId, userId, (s) => s.postureScore);
}

// --- Fatigue / wellness ----------------------------------------------------------

export interface FatigueSnapshotData {
  energyLevel: EnergyLevel;
  fatigueTrend: TrendDirection;
  recoveryTrend: TrendDirection;
  eyeFatigueLevel: FatigueLevel;
  bodyFatigueLevel: FatigueLevel;
  longSessionAlert: boolean;
  drowsinessStatus: DrowsinessStatus;
  microsleepEventsToday: number;
  focusRecoveryMinutes: number;
}

export async function getFatigueSnapshot(
  orgId: string,
  userId: string,
): Promise<FatigueSnapshotData> {
  const prisma = await getPrisma();
  const day = await resolveActiveDay(orgId, userId);
  const samples = await samplesInRange(orgId, userId, day.start, day.end);

  const fatigueScore = round(average(samples.map((s) => s.fatigueScore)));
  const postureScore = round(average(samples.map((s) => s.postureScore)));
  const previousAvg = await previousDayAverage(orgId, userId, day.start, (s) => s.fatigueScore);
  const trend = trendFrom(fatigueScore, previousAvg);

  const microsleepEventsToday = await prisma.trackingEvent.count({
    where: {
      type: "drowsiness_alert",
      session: { orgId, userId },
      createdAt: { gte: day.start, lt: day.end },
    },
  });

  const longestSession = await prisma.trackingSession.findFirst({
    where: { orgId, userId, startedAt: { gte: day.start, lt: day.end } },
    orderBy: { durationSeconds: "desc" },
  });
  const longSessionAlert = (longestSession?.durationSeconds ?? 0) / 60 >= LONG_SESSION_MINUTES;

  return {
    energyLevel: energyLevelOf(fatigueScore),
    fatigueTrend: trend,
    recoveryTrend: trend,
    eyeFatigueLevel: fatigueLevelOf(fatigueScore),
    bodyFatigueLevel: fatigueLevelOf(postureScore),
    longSessionAlert,
    drowsinessStatus: drowsinessStatusOf(fatigueScore),
    microsleepEventsToday,
    focusRecoveryMinutes: FOCUS_RECOVERY_MINUTES_ESTIMATE,
  };
}

export interface FatigueTrendPointData {
  label: string;
  energyScore: number;
}

export async function getFatigueTrend(
  orgId: string,
  userId: string,
): Promise<FatigueTrendPointData[]> {
  const points = await getDailyTrend(orgId, userId, (s) => s.fatigueScore);
  return points.map((p) => ({ label: p.label, energyScore: p.score }));
}

// --- Shared 7-day daily trend helper --------------------------------------------

const TREND_DAYS = 7;

async function getDailyTrend(
  orgId: string,
  userId: string,
  metric: (s: TrackingMetricSample) => number,
): Promise<PostureTrendPointData[]> {
  const prisma = await getPrisma();
  const todayBounds = dayBoundsUTC(new Date());
  const rangeStart = new Date(todayBounds.start.getTime() - (TREND_DAYS - 1) * DAY_MS);

  const samples = await prisma.trackingMetricSample.findMany({
    where: { orgId, userId, windowStart: { gte: rangeStart, lt: todayBounds.end } },
    orderBy: { windowStart: "asc" },
  });

  const byDay = new Map<string, TrackingMetricSample[]>();
  for (const sample of samples) {
    const key = dayBoundsUTC(sample.windowStart).start.toISOString();
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(sample);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, daySamples]) => ({
      label: formatDayLabel(new Date(key)),
      score: round(average(daySamples.map(metric))),
    }));
}

// --- Gestures (Phase 2, "hand" mode only) -----------------------------------
// Same 7 literals as `src/features/intelligence/types.ts`'s `GestureType` —
// redeclared locally since server code doesn't import from `src/features/*`.

export type GestureType =
  "wave" | "raise-hand" | "point" | "thumbs-up" | "pinch" | "open-palm" | "closed-hand";

const ALL_GESTURE_TYPES: GestureType[] = [
  "wave",
  "raise-hand",
  "point",
  "thumbs-up",
  "pinch",
  "open-palm",
  "closed-hand",
];

const GESTURE_WINDOW_MS = 72 * 60 * 60 * 1000; // matches the mock's 72h window

function isGestureType(value: unknown): value is GestureType {
  return typeof value === "string" && (ALL_GESTURE_TYPES as string[]).includes(value);
}

export interface GestureEventData {
  id: string;
  type: GestureType;
  timestamp: string;
  sessionLabel: string;
}

export async function getGestureEvents(orgId: string, userId: string): Promise<GestureEventData[]> {
  const prisma = await getPrisma();
  const since = new Date(Date.now() - GESTURE_WINDOW_MS);

  const events = await prisma.trackingEvent.findMany({
    where: { type: "gesture", session: { orgId, userId }, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    include: { session: { select: { title: true } } },
  });

  return events
    .map((event) => {
      const data = event.data as { gestureType?: unknown } | null;
      if (!isGestureType(data?.gestureType)) return null;
      return {
        id: event.id,
        type: data.gestureType,
        timestamp: event.createdAt.toISOString(),
        sessionLabel: event.session.title,
      };
    })
    .filter((e): e is GestureEventData => e !== null);
}

export interface GestureSummaryData {
  type: GestureType;
  count: number;
}

/** Always all 7 types, zero-filled, sorted desc — the page's grid renders exactly what it's given. */
export async function getGestureSummaries(
  orgId: string,
  userId: string,
): Promise<GestureSummaryData[]> {
  const prisma = await getPrisma();
  const since = new Date(Date.now() - GESTURE_WINDOW_MS);

  const events = await prisma.trackingEvent.findMany({
    where: { type: "gesture", session: { orgId, userId }, createdAt: { gte: since } },
    select: { data: true },
  });

  const counts = new Map<GestureType, number>();
  for (const event of events) {
    const data = event.data as { gestureType?: unknown } | null;
    if (!isGestureType(data?.gestureType)) continue;
    counts.set(data.gestureType, (counts.get(data.gestureType) ?? 0) + 1);
  }

  return ALL_GESTURE_TYPES.map((type) => ({ type, count: counts.get(type) ?? 0 })).sort(
    (a, b) => b.count - a.count,
  );
}

// --- Movement pattern (Phase 2, "pose" mode only) ---------------------------

const MOVEMENT_STATES = ["walking", "standing", "sitting", "running", "idle"] as const;

export interface MovementPatternPointData {
  activity: (typeof MOVEMENT_STATES)[number];
  minutes: number;
}

/** Always all 5 states, zero-filled, sorted desc by minutes — matches the mock's exact contract. */
export async function getMovementPattern(
  orgId: string,
  userId: string,
): Promise<MovementPatternPointData[]> {
  const day = await resolveActiveDay(orgId, userId);
  const samples = await samplesInRange(orgId, userId, day.start, day.end);

  const minutesByState = new Map<string, number>();
  for (const sample of samples) {
    if (!sample.movementState) continue;
    const minutes = (sample.windowEnd.getTime() - sample.windowStart.getTime()) / 60_000;
    minutesByState.set(
      sample.movementState,
      (minutesByState.get(sample.movementState) ?? 0) + minutes,
    );
  }

  return MOVEMENT_STATES.map((activity) => ({
    activity,
    minutes: round(minutesByState.get(activity) ?? 0),
  })).sort((a, b) => b.minutes - a.minutes);
}

export interface ActivityQualityPointData {
  label: string;
  quality: number;
}

/**
 * 7-day trend of `computeActivityQualityScore()` — needs both that day's
 * average attention score and its non-idle fraction, so it groups samples
 * itself rather than reusing the single-metric `getDailyTrend` above. Days
 * with tracking but no pose data (movementState never set) fall back to a
 * neutral 0.5 active-fraction rather than silently zeroing the score.
 */
export async function getActivityQualityTrend(
  orgId: string,
  userId: string,
): Promise<ActivityQualityPointData[]> {
  const prisma = await getPrisma();
  const todayBounds = dayBoundsUTC(new Date());
  const rangeStart = new Date(todayBounds.start.getTime() - (TREND_DAYS - 1) * DAY_MS);

  const samples = await prisma.trackingMetricSample.findMany({
    where: { orgId, userId, windowStart: { gte: rangeStart, lt: todayBounds.end } },
    orderBy: { windowStart: "asc" },
  });

  const byDay = new Map<string, TrackingMetricSample[]>();
  for (const sample of samples) {
    const key = dayBoundsUTC(sample.windowStart).start.toISOString();
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(sample);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, daySamples]) => {
      const attentionAvg = average(daySamples.map((s) => s.attentionScore));
      const withMovement = daySamples.filter((s) => s.movementState !== null);
      const activeFraction =
        withMovement.length > 0
          ? withMovement.filter((s) => s.movementState !== "idle").length / withMovement.length
          : 0.5;
      return {
        label: formatDayLabel(new Date(key)),
        quality: computeActivityQualityScore(attentionAvg, activeFraction),
      };
    });
}

// --- Exercise sets (Phase 2, "pose" mode only) ------------------------------

const EXERCISE_SET_WINDOW_MS = 7 * DAY_MS;

export interface ExerciseSetData {
  id: string;
  exerciseName: string;
  reps: number;
  durationSeconds: number;
  caloriesEstimate: number;
  timestamp: string;
}

export async function getExerciseSets(orgId: string, userId: string): Promise<ExerciseSetData[]> {
  const prisma = await getPrisma();
  const since = new Date(Date.now() - EXERCISE_SET_WINDOW_MS);

  const sets = await prisma.exerciseSet.findMany({
    where: { orgId, userId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });

  return sets.map((set) => ({
    id: set.id,
    exerciseName: set.exerciseName,
    reps: set.reps,
    durationSeconds: set.durationSeconds,
    caloriesEstimate: set.caloriesEstimate,
    timestamp: set.createdAt.toISOString(),
  }));
}

export interface WorkoutTrendPointData {
  label: string;
  reps: number;
}

export async function getWorkoutTrend(
  orgId: string,
  userId: string,
): Promise<WorkoutTrendPointData[]> {
  const prisma = await getPrisma();
  const todayBounds = dayBoundsUTC(new Date());
  const rangeStart = new Date(todayBounds.start.getTime() - (TREND_DAYS - 1) * DAY_MS);

  const sets = await prisma.exerciseSet.findMany({
    where: { orgId, userId, createdAt: { gte: rangeStart, lt: todayBounds.end } },
    orderBy: { createdAt: "asc" },
  });

  const repsByDay = new Map<string, number>();
  for (const set of sets) {
    const key = dayBoundsUTC(set.createdAt).start.toISOString();
    repsByDay.set(key, (repsByDay.get(key) ?? 0) + set.reps);
  }

  return Array.from(repsByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, reps]) => ({ label: formatDayLabel(new Date(key)), reps }));
}

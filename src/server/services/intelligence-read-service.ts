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

/**
 * The (simulated) Behavior Engine — deterministic, rule-based computation
 * over seeded mock data, exactly like every other mock service in this app
 * (`@/features/reporting`'s insight-engine, `@/features/activity-intelligence`'s
 * insights). Nothing here is a real model or inference; "forecasts" are
 * plain trend extrapolation. This file is the one place that vocabulary
 * lives — pages/components only ever render what it returns, never raw
 * scores framed as ML confidence.
 */

import type {
  ActivityKind,
  ActivityQualityPoint,
  AlignmentQuality,
  AttentionSnapshot,
  BehaviorEventType,
  BehaviorTimelineEvent,
  DistractionEvent,
  DrowsinessStatus,
  EngagementLevel,
  EnergyLevel,
  ExerciseSet,
  FatigueLevel,
  FatigueSnapshot,
  FatigueTrendPoint,
  Forecast,
  ForecastMetric,
  FocusTimelinePoint,
  GestureEvent,
  GestureSummary,
  GestureType,
  IntelligenceInsight,
  MoodState,
  MovementPatternPoint,
  PillarId,
  PillarScore,
  PostureSnapshot,
  PostureTrendPoint,
  Recommendation,
  TrendDirection,
  WellnessSnapshot,
  WellnessTrendPoint,
  WorkoutTrendPoint,
} from "../types";

function delay<T>(value: T, ms = 450): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.floor(seededRandom(seed) * items.length) % items.length];
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

// ---------------------------------------------------------------------------
// Wellness score + pillars
// ---------------------------------------------------------------------------

const PILLAR_META: Record<
  PillarId,
  { label: string; base: number; summary: (score: number) => string }
> = {
  attention: {
    label: "Attention",
    base: 78,
    summary: (s) =>
      s >= 75 ? "Staying focused for long stretches" : "Focus has been a little scattered",
  },
  movement: {
    label: "Movement",
    base: 65,
    summary: (s) => (s >= 70 ? "Good variety of movement today" : "Mostly stationary today"),
  },
  posture: {
    label: "Posture",
    base: 71,
    summary: (s) => (s >= 75 ? "Holding an upright, balanced posture" : "Some slouching detected"),
  },
  recovery: {
    label: "Recovery",
    base: 58,
    summary: (s) => (s >= 65 ? "Energy is holding up well" : "Signs of fatigue building up"),
  },
};

function buildPillars(): PillarScore[] {
  return (Object.keys(PILLAR_META) as PillarId[]).map((id, i) => {
    const seed = i * 19 + 7;
    const meta = PILLAR_META[id];
    const score = clamp(Math.round(meta.base + (seededRandom(seed) - 0.5) * 14));
    const trendDelta = Math.round((seededRandom(seed + 1) - 0.45) * 12);
    const trend: TrendDirection =
      trendDelta > 2 ? "improving" : trendDelta < -2 ? "declining" : "stable";
    return { id, label: meta.label, score, trend, trendDelta, summary: meta.summary(score) };
  });
}

const PILLARS = buildPillars();

function moodFromPillars(pillars: PillarScore[]): {
  mood: MoodState;
  label: string;
  description: string;
} {
  const attention = pillars.find((p) => p.id === "attention")!.score;
  const recovery = pillars.find((p) => p.id === "recovery")!.score;
  const movement = pillars.find((p) => p.id === "movement")!.score;
  const posture = pillars.find((p) => p.id === "posture")!.score;

  if (recovery < 50)
    return {
      mood: "low-energy",
      label: "Low energy",
      description: "Signs point to fatigue — a short break would help.",
    };
  if (attention >= 80 && posture >= 75)
    return {
      mood: "focused",
      label: "Focused",
      description: "Deep, sustained focus with a steady posture.",
    };
  if (movement >= 75)
    return {
      mood: "engaged",
      label: "Engaged",
      description: "Active and moving well throughout the day.",
    };
  if (attention >= 70 && recovery >= 65)
    return { mood: "calm", label: "Calm", description: "Steady, even-paced activity all day." };
  if (attention < 55)
    return {
      mood: "thinking",
      label: "Thinking it through",
      description: "A slower, more deliberate pace today.",
    };
  return {
    mood: "neutral",
    label: "Neutral",
    description: "Nothing stands out — a typical, balanced day.",
  };
}

export function computeWellnessSnapshot(): WellnessSnapshot {
  const overallScore = Math.round(PILLARS.reduce((sum, p) => sum + p.score, 0) / PILLARS.length);
  const { mood, label, description } = moodFromPillars(PILLARS);
  return {
    overallScore,
    pillars: PILLARS,
    mood,
    moodLabel: label,
    moodDescription: description,
    computedAtLabel: "Today",
  };
}

function buildWeeklyTrend(base: number, seedOffset: number): { label: string; value: number }[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((label, i) => {
    const seed = seedOffset + i * 11 + 3;
    return { label, value: clamp(Math.round(base + (seededRandom(seed) - 0.5) * 18)) };
  });
}

export function computeWellnessTrend(): WellnessTrendPoint[] {
  return buildWeeklyTrend(68, 101).map((p) => ({ label: p.label, score: p.value }));
}

// ---------------------------------------------------------------------------
// Attention engine
// ---------------------------------------------------------------------------

function engagementFor(score: number): EngagementLevel {
  if (score >= 82) return "highly-engaged";
  if (score >= 65) return "engaged";
  if (score >= 45) return "moderately-engaged";
  return "distracted";
}

export function computeAttentionSnapshot(): AttentionSnapshot {
  const score = PILLARS.find((p) => p.id === "attention")!.score;
  return {
    score,
    engagement: engagementFor(score),
    distractionEventsToday: 3 + Math.floor(seededRandom(211) * 5),
    focusDurationMinutes: 90 + Math.floor(seededRandom(212) * 120),
    peakFocusWindow: "9:30–11:00 AM",
    trend: PILLARS.find((p) => p.id === "attention")!.trend,
  };
}

export function buildFocusTimeline(): FocusTimelinePoint[] {
  const hours = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM"];
  return hours.map((time, i) => ({
    time,
    focusScore: clamp(Math.round(60 + Math.sin(i / 1.6) * 22 + (seededRandom(300 + i) - 0.5) * 10)),
  }));
}

export function buildDistractionEvents(): DistractionEvent[] {
  const labels = [
    "Notification checked",
    "Left the frame briefly",
    "Conversation nearby",
    "Phone glance",
    "Room activity",
  ];
  return Array.from({ length: 6 }, (_, i) => {
    const seed = i * 23 + 9;
    return {
      id: `dist-${i}`,
      timestamp: new Date(
        Date.now() - Math.floor(seededRandom(seed) * 8) * 3_600_000,
      ).toISOString(),
      durationSeconds: 10 + Math.floor(seededRandom(seed + 1) * 90),
      label: pick(labels, seed + 2),
    };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ---------------------------------------------------------------------------
// Posture engine
// ---------------------------------------------------------------------------

function alignmentFor(score: number): AlignmentQuality {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "needs-improvement";
}

export function computePostureSnapshot(): PostureSnapshot {
  const score = PILLARS.find((p) => p.id === "posture")!.score;
  const shoulder = clamp(score + Math.round((seededRandom(401) - 0.5) * 16));
  const head = clamp(score + Math.round((seededRandom(402) - 0.5) * 16));
  const neck = clamp(score + Math.round((seededRandom(403) - 0.5) * 16));
  const balance = clamp(score + Math.round((seededRandom(404) - 0.5) * 16));
  return {
    score,
    shoulderAlignment: alignmentFor(shoulder),
    headAlignment: alignmentFor(head),
    neckPosition: alignmentFor(neck),
    bodyBalance: alignmentFor(balance),
    stability: clamp(score + Math.round((seededRandom(405) - 0.5) * 10)),
    trend: PILLARS.find((p) => p.id === "posture")!.trend,
    dailyImprovementPercent: Math.round((seededRandom(406) - 0.3) * 12),
  };
}

export function computePostureTrend(): PostureTrendPoint[] {
  return buildWeeklyTrend(71, 501).map((p) => ({ label: p.label, score: p.value }));
}

// ---------------------------------------------------------------------------
// Fatigue & wellness
// ---------------------------------------------------------------------------

function energyLevelFor(score: number): EnergyLevel {
  if (score >= 70) return "high";
  if (score >= 45) return "moderate";
  return "low";
}

function fatigueLevelFor(score: number): FatigueLevel {
  if (score >= 70) return "low";
  if (score >= 45) return "moderate";
  return "high";
}

function drowsinessFor(score: number): DrowsinessStatus {
  if (score >= 65) return "alert";
  if (score >= 40) return "slightly-tired";
  return "drowsy";
}

export function computeFatigueSnapshot(): FatigueSnapshot {
  const recovery = PILLARS.find((p) => p.id === "recovery")!.score;
  return {
    energyLevel: energyLevelFor(recovery),
    fatigueTrend: recovery < 55 ? "declining" : PILLARS.find((p) => p.id === "recovery")!.trend,
    recoveryTrend: PILLARS.find((p) => p.id === "recovery")!.trend,
    eyeFatigueLevel: fatigueLevelFor(clamp(recovery + Math.round((seededRandom(601) - 0.5) * 20))),
    bodyFatigueLevel: fatigueLevelFor(clamp(recovery + Math.round((seededRandom(602) - 0.5) * 20))),
    longSessionAlert: seededRandom(603) > 0.7,
    drowsinessStatus: drowsinessFor(recovery),
    microsleepEventsToday: recovery < 45 ? 1 + Math.floor(seededRandom(604) * 3) : 0,
    focusRecoveryMinutes: 5 + Math.floor(seededRandom(605) * 15),
  };
}

export function computeFatigueTrend(): FatigueTrendPoint[] {
  return buildWeeklyTrend(58, 701).map((p) => ({ label: p.label, energyScore: p.value }));
}

// ---------------------------------------------------------------------------
// Gesture engine
// ---------------------------------------------------------------------------

const GESTURE_TYPES: GestureType[] = [
  "wave",
  "raise-hand",
  "point",
  "thumbs-up",
  "pinch",
  "open-palm",
  "closed-hand",
];
const SESSION_LABELS = [
  "Morning check-in",
  "Weekly baseline",
  "Client demo",
  "Standing desk trial",
  "Posture assessment",
];

export function buildGestureEvents(): GestureEvent[] {
  return Array.from({ length: 24 }, (_, i) => {
    const seed = i * 31 + 5;
    return {
      id: `gst-${i}`,
      type: pick(GESTURE_TYPES, seed),
      timestamp: new Date(
        Date.now() - Math.floor(seededRandom(seed + 1) * 72) * 3_600_000,
      ).toISOString(),
      sessionLabel: pick(SESSION_LABELS, seed + 2),
    };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function summarizeGestures(events: GestureEvent[]): GestureSummary[] {
  const counts = new Map<GestureType, number>();
  events.forEach((e) => counts.set(e.type, (counts.get(e.type) ?? 0) + 1));
  return GESTURE_TYPES.map((type) => ({ type, count: counts.get(type) ?? 0 })).sort(
    (a, b) => b.count - a.count,
  );
}

// ---------------------------------------------------------------------------
// Exercise engine
// ---------------------------------------------------------------------------

const EXERCISE_NAMES = [
  "Squats",
  "Shoulder rolls",
  "Neck stretches",
  "Standing lunges",
  "Arm raises",
  "Torso twists",
];

export function buildExerciseSets(): ExerciseSet[] {
  return Array.from({ length: 12 }, (_, i) => {
    const seed = i * 37 + 11;
    const reps = 8 + Math.floor(seededRandom(seed) * 15);
    return {
      id: `ex-${i}`,
      exerciseName: pick(EXERCISE_NAMES, seed + 1),
      reps,
      durationSeconds: 30 + Math.floor(seededRandom(seed + 2) * 90),
      caloriesEstimate: Math.round(reps * 0.6 + seededRandom(seed + 3) * 5),
      timestamp: new Date(
        Date.now() - Math.floor(seededRandom(seed + 4) * 168) * 3_600_000,
      ).toISOString(),
    };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function computeWorkoutTrend(): WorkoutTrendPoint[] {
  return buildWeeklyTrend(45, 801).map((p) => ({
    label: p.label,
    reps: Math.round(p.value / 1.5),
  }));
}

// ---------------------------------------------------------------------------
// Movement intelligence
// ---------------------------------------------------------------------------

const MOVEMENT_KINDS: ActivityKind[] = ["walking", "standing", "sitting", "running", "idle"];

export function computeMovementPattern(): MovementPatternPoint[] {
  return MOVEMENT_KINDS.map((activity, i) => ({
    activity,
    minutes: 15 + Math.floor(seededRandom(901 + i * 7) * 90),
  })).sort((a, b) => b.minutes - a.minutes);
}

export function computeActivityQualityTrend(): ActivityQualityPoint[] {
  return buildWeeklyTrend(66, 1001).map((p) => ({ label: p.label, quality: p.value }));
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

let insightCounter = 0;
function nextInsightId(): string {
  insightCounter += 1;
  return `insight-${insightCounter}`;
}

export function buildInsights(): IntelligenceInsight[] {
  return [
    {
      id: nextInsightId(),
      period: "executive",
      category: "focus",
      tone: "positive",
      title: "Focus is trending up",
      description: "Attention scores have improved over the last 7 days.",
    },
    {
      id: nextInsightId(),
      period: "executive",
      category: "posture",
      tone: "neutral",
      title: "Posture holding steady",
      description: "No major changes in posture quality this week.",
    },
    {
      id: nextInsightId(),
      period: "daily",
      category: "focus",
      tone: "positive",
      title: "Peak focus window",
      description: "Your sharpest focus today was between 9:30 and 11:00 AM.",
    },
    {
      id: nextInsightId(),
      period: "daily",
      category: "movement",
      tone: "neutral",
      title: "Mostly seated today",
      description: "Standing and walking made up less than a third of tracked time.",
    },
    {
      id: nextInsightId(),
      period: "daily",
      category: "posture",
      tone: "negative",
      title: "Shoulder alignment dipped",
      description: "Shoulder alignment was lower than usual in the afternoon.",
    },
    {
      id: nextInsightId(),
      period: "weekly",
      category: "activity",
      tone: "positive",
      title: "Most active day: Wednesday",
      description: "Wednesday had the highest combined movement and exercise activity.",
    },
    {
      id: nextInsightId(),
      period: "weekly",
      category: "focus",
      tone: "positive",
      title: "Fewer distractions this week",
      description: "Distraction events dropped compared to last week.",
    },
    {
      id: nextInsightId(),
      period: "weekly",
      category: "session",
      tone: "neutral",
      title: "Session length steady",
      description: "Average session length stayed consistent week over week.",
    },
    {
      id: nextInsightId(),
      period: "monthly",
      category: "posture",
      tone: "positive",
      title: "Posture improving month over month",
      description: "Posture scores are up compared to last month's average.",
    },
    {
      id: nextInsightId(),
      period: "monthly",
      category: "movement",
      tone: "neutral",
      title: "Movement variety unchanged",
      description: "The mix of standing, walking, and sitting stayed similar to last month.",
    },
    {
      id: nextInsightId(),
      period: "session",
      category: "session",
      tone: "positive",
      title: "Strong session quality",
      description: "Tracking quality stayed excellent for the full session.",
    },
  ];
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

let recCounter = 0;
function nextRecId(): string {
  recCounter += 1;
  return `rec-${recCounter}`;
}

export function buildRecommendations(): Recommendation[] {
  return [
    {
      id: nextRecId(),
      category: "posture",
      title: "Straighten up",
      description: "Shoulder alignment has dipped — a quick posture reset can help.",
      priority: "medium",
      actionLabel: "Show posture tips",
    },
    {
      id: nextRecId(),
      category: "break",
      title: "Take a short break",
      description: "You've been in a long session — a 5-minute break supports focus.",
      priority: "high",
      actionLabel: "Start a break timer",
    },
    {
      id: nextRecId(),
      category: "stretch",
      title: "Stretch your shoulders",
      description: "A minute of shoulder rolls can ease tension from sitting.",
      priority: "low",
      actionLabel: "View stretch",
    },
    {
      id: nextRecId(),
      category: "fatigue",
      title: "Signs of fatigue",
      description: "Energy levels are trending down — consider resting your eyes.",
      priority: "medium",
      actionLabel: "Learn more",
    },
    {
      id: nextRecId(),
      category: "focus",
      title: "Reduce distractions",
      description: "A few more interruptions than usual — try silencing notifications.",
      priority: "low",
      actionLabel: "Focus tips",
    },
    {
      id: nextRecId(),
      category: "hydration",
      title: "Stay hydrated",
      description: "It's been a while — a glass of water can help sustain focus.",
      priority: "low",
      actionLabel: "Dismiss",
    },
    {
      id: nextRecId(),
      category: "movement",
      title: "Move a little more",
      description: "Standing or walking for a few minutes can lift energy levels.",
      priority: "medium",
      actionLabel: "Set a reminder",
    },
  ];
}

// ---------------------------------------------------------------------------
// Predictive analytics (trend-based forecasts)
// ---------------------------------------------------------------------------

const FORECAST_META: Record<ForecastMetric, { label: string; base: number }> = {
  fatigue: { label: "Energy forecast", base: 58 },
  attention: { label: "Attention forecast", base: 78 },
  "session-quality": { label: "Session quality forecast", base: 82 },
  movement: { label: "Movement forecast", base: 65 },
  "exercise-progress": { label: "Exercise progress forecast", base: 45 },
};

function forecastSummary(metric: ForecastMetric, direction: TrendDirection): string {
  const phrases: Record<ForecastMetric, Record<TrendDirection, string>> = {
    fatigue: {
      improving: "Energy is expected to hold steady through the week.",
      stable: "Energy levels look set to stay consistent.",
      declining: "Energy may dip later this week — plan lighter sessions.",
    },
    attention: {
      improving: "Focus is on track to keep improving.",
      stable: "Focus is expected to stay consistent.",
      declining: "Focus may soften slightly — shorter sessions could help.",
    },
    "session-quality": {
      improving: "Session quality is trending toward excellent.",
      stable: "Session quality should remain strong.",
      declining: "Session quality may vary — check lighting and framing.",
    },
    movement: {
      improving: "Movement variety is expected to keep increasing.",
      stable: "Movement levels look set to stay balanced.",
      declining: "Movement may taper off — a short walk could help.",
    },
    "exercise-progress": {
      improving: "On pace for a new weekly rep record.",
      stable: "Exercise volume looks set to stay steady.",
      declining: "Exercise volume may slow down this week.",
    },
  };
  return phrases[metric][direction];
}

export function buildForecasts(): Forecast[] {
  return (Object.keys(FORECAST_META) as ForecastMetric[]).map((metric, mi) => {
    const meta = FORECAST_META[metric];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const historical = days.slice(0, 5).map((label, i) => {
      const seed = mi * 97 + i * 13 + 3;
      return { label, value: clamp(Math.round(meta.base + (seededRandom(seed) - 0.5) * 16)) };
    });
    const lastValue = historical[historical.length - 1].value;
    const slopeSeed = mi * 97 + 500;
    const slope = (seededRandom(slopeSeed) - 0.45) * 6;
    const direction: TrendDirection = slope > 1 ? "improving" : slope < -1 ? "declining" : "stable";
    const projected = days.slice(5).map((label, i) => ({
      label,
      value: clamp(Math.round(lastValue + slope * (i + 1))),
      projected: true,
    }));
    return {
      id: `forecast-${metric}`,
      metric,
      label: meta.label,
      direction,
      summary: forecastSummary(metric, direction),
      points: [...historical, ...projected],
    };
  });
}

// ---------------------------------------------------------------------------
// Behavior timeline
// ---------------------------------------------------------------------------

const BEHAVIOR_TEMPLATES: { type: BehaviorEventType; label: string }[] = [
  { type: "mood-shift", label: "Mood shifted to focused" },
  { type: "focus-peak", label: "Reached peak focus" },
  { type: "focus-dip", label: "Focus dipped briefly" },
  { type: "posture-alert", label: "Posture reminder triggered" },
  { type: "movement-burst", label: "Burst of movement detected" },
  { type: "gesture", label: "Hand raised" },
  { type: "break-taken", label: "Break taken" },
  { type: "recommendation-followed", label: "Stretch recommendation followed" },
];

export function buildBehaviorTimeline(): BehaviorTimelineEvent[] {
  return Array.from({ length: 18 }, (_, i) => {
    const seed = i * 43 + 17;
    const template = pick(BEHAVIOR_TEMPLATES, seed);
    return {
      id: `beh-${i}`,
      type: template.type,
      timestamp: new Date(
        Date.now() - Math.floor(seededRandom(seed + 1) * 30) * 3_600_000,
      ).toISOString(),
      label: template.label,
    };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ---------------------------------------------------------------------------
// Fetchers (delayed, matching every other mock service in this app)
// ---------------------------------------------------------------------------

const GESTURE_EVENTS = buildGestureEvents();
const EXERCISE_SETS = buildExerciseSets();
const INSIGHTS = buildInsights();
const RECOMMENDATIONS = buildRecommendations();
const FORECASTS = buildForecasts();
const BEHAVIOR_TIMELINE = buildBehaviorTimeline();

export function fetchWellnessSnapshot(): Promise<WellnessSnapshot> {
  return delay(computeWellnessSnapshot(), 450);
}
export function fetchWellnessTrend(): Promise<WellnessTrendPoint[]> {
  return delay(computeWellnessTrend(), 400);
}
export function fetchAttentionSnapshot(): Promise<AttentionSnapshot> {
  return delay(computeAttentionSnapshot(), 400);
}
export function fetchFocusTimeline(): Promise<FocusTimelinePoint[]> {
  return delay(buildFocusTimeline(), 400);
}
export function fetchDistractionEvents(): Promise<DistractionEvent[]> {
  return delay(buildDistractionEvents(), 400);
}
export function fetchPostureSnapshot(): Promise<PostureSnapshot> {
  return delay(computePostureSnapshot(), 400);
}
export function fetchPostureTrend(): Promise<PostureTrendPoint[]> {
  return delay(computePostureTrend(), 400);
}
export function fetchFatigueSnapshot(): Promise<FatigueSnapshot> {
  return delay(computeFatigueSnapshot(), 400);
}
export function fetchFatigueTrend(): Promise<FatigueTrendPoint[]> {
  return delay(computeFatigueTrend(), 400);
}
export function fetchGestureEvents(): Promise<GestureEvent[]> {
  return delay(GESTURE_EVENTS, 450);
}
export function fetchGestureSummaries(): Promise<GestureSummary[]> {
  return delay(summarizeGestures(GESTURE_EVENTS), 400);
}
export function fetchExerciseSets(): Promise<ExerciseSet[]> {
  return delay(EXERCISE_SETS, 450);
}
export function fetchWorkoutTrend(): Promise<WorkoutTrendPoint[]> {
  return delay(computeWorkoutTrend(), 400);
}
export function fetchMovementPattern(): Promise<MovementPatternPoint[]> {
  return delay(computeMovementPattern(), 400);
}
export function fetchActivityQualityTrend(): Promise<ActivityQualityPoint[]> {
  return delay(computeActivityQualityTrend(), 400);
}
export function fetchInsights(): Promise<IntelligenceInsight[]> {
  return delay(INSIGHTS, 450);
}
export function fetchRecommendations(): Promise<Recommendation[]> {
  return delay(RECOMMENDATIONS, 450);
}
export function fetchForecasts(): Promise<Forecast[]> {
  return delay(FORECASTS, 500);
}
export function fetchBehaviorTimeline(): Promise<BehaviorTimelineEvent[]> {
  return delay(BEHAVIOR_TIMELINE, 450);
}

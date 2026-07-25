/**
 * Public contract for the intelligence feature — a premium, Apple
 * Health/Whoop/Oura-style synthesis layer that turns tracking data into
 * calm, human-language wellbeing signals. Every number here comes from
 * DETERMINISTIC, RULE-BASED computation over seeded mock data (the same
 * convention as `@/features/reporting`'s insight-engine and
 * `@/features/activity-intelligence`'s insights) — there is no real model,
 * no inference, and nothing here is ever framed as AI. "Forecasts" are
 * simple trend extrapolations, presented as intelligent software being
 * helpful, not as machine-learning predictions.
 *
 * Reuses `ActivityType` from `@/features/activity-intelligence` for the
 * Movement section rather than redefining the same vocabulary twice.
 */

import type { ActivityKind } from "@/features/activity-intelligence";

export type { ActivityKind };

// ---------------------------------------------------------------------------
// Wellness score + pillars (the dashboard's organizing narrative)
// ---------------------------------------------------------------------------

export type PillarId = "attention" | "movement" | "posture" | "recovery";
export type TrendDirection = "improving" | "stable" | "declining";

export interface PillarScore {
  id: PillarId;
  label: string;
  score: number;
  trend: TrendDirection;
  trendDelta: number;
  summary: string;
}

export type MoodState =
  "calm" | "happy" | "focused" | "neutral" | "surprised" | "thinking" | "engaged" | "low-energy";

export interface WellnessSnapshot {
  overallScore: number;
  pillars: PillarScore[];
  mood: MoodState;
  moodLabel: string;
  moodDescription: string;
  computedAtLabel: string;
}

export interface WellnessTrendPoint {
  label: string;
  score: number;
}

// ---------------------------------------------------------------------------
// Attention engine
// ---------------------------------------------------------------------------

export type EngagementLevel = "highly-engaged" | "engaged" | "moderately-engaged" | "distracted";

export interface AttentionSnapshot {
  score: number;
  engagement: EngagementLevel;
  distractionEventsToday: number;
  focusDurationMinutes: number;
  peakFocusWindow: string;
  trend: TrendDirection;
}

export interface FocusTimelinePoint {
  time: string;
  focusScore: number;
}

export interface DistractionEvent {
  id: string;
  timestamp: string;
  durationSeconds: number;
  label: string;
}

// ---------------------------------------------------------------------------
// Posture engine
// ---------------------------------------------------------------------------

export type AlignmentQuality = "excellent" | "good" | "fair" | "needs-improvement";

export interface PostureSnapshot {
  score: number;
  shoulderAlignment: AlignmentQuality;
  headAlignment: AlignmentQuality;
  neckPosition: AlignmentQuality;
  bodyBalance: AlignmentQuality;
  stability: number;
  trend: TrendDirection;
  dailyImprovementPercent: number;
}

export interface PostureTrendPoint {
  label: string;
  score: number;
}

// ---------------------------------------------------------------------------
// Fatigue & wellness (recovery pillar detail)
// ---------------------------------------------------------------------------

export type EnergyLevel = "high" | "moderate" | "low";
export type FatigueLevel = "low" | "moderate" | "high";
export type DrowsinessStatus = "alert" | "slightly-tired" | "drowsy";

export interface FatigueSnapshot {
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

export interface FatigueTrendPoint {
  label: string;
  energyScore: number;
}

// ---------------------------------------------------------------------------
// Gesture engine
// ---------------------------------------------------------------------------

export type GestureType =
  "wave" | "raise-hand" | "point" | "thumbs-up" | "pinch" | "open-palm" | "closed-hand";

export interface GestureEvent {
  id: string;
  type: GestureType;
  timestamp: string;
  sessionLabel: string;
}

export interface GestureSummary {
  type: GestureType;
  count: number;
}

// ---------------------------------------------------------------------------
// Exercise engine
// ---------------------------------------------------------------------------

export interface ExerciseSet {
  id: string;
  exerciseName: string;
  reps: number;
  durationSeconds: number;
  caloriesEstimate: number;
  timestamp: string;
}

export interface WorkoutTrendPoint {
  label: string;
  reps: number;
}

// ---------------------------------------------------------------------------
// Movement intelligence
// ---------------------------------------------------------------------------

export interface MovementPatternPoint {
  activity: ActivityKind;
  minutes: number;
}

export interface ActivityQualityPoint {
  label: string;
  quality: number;
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export type InsightPeriod = "executive" | "daily" | "weekly" | "monthly" | "session";
export type InsightCategory = "movement" | "focus" | "posture" | "activity" | "session";
export type InsightTone = "positive" | "neutral" | "negative";

export interface IntelligenceInsight {
  id: string;
  period: InsightPeriod;
  category: InsightCategory;
  tone: InsightTone;
  title: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export type RecommendationCategory =
  "posture" | "break" | "stretch" | "fatigue" | "focus" | "hydration" | "movement";
export type RecommendationPriority = "low" | "medium" | "high";

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  title: string;
  description: string;
  priority: RecommendationPriority;
  actionLabel: string;
}

// ---------------------------------------------------------------------------
// Predictive analytics (trend-based forecasts, never "AI predictions")
// ---------------------------------------------------------------------------

export type ForecastMetric =
  "fatigue" | "attention" | "session-quality" | "movement" | "exercise-progress";

export interface ForecastPoint {
  label: string;
  value: number;
  projected?: boolean;
}

export interface Forecast {
  id: string;
  metric: ForecastMetric;
  label: string;
  direction: TrendDirection;
  summary: string;
  points: ForecastPoint[];
}

// ---------------------------------------------------------------------------
// Behavior timeline (cross-cutting event feed)
// ---------------------------------------------------------------------------

export type BehaviorEventType =
  | "mood-shift"
  | "focus-peak"
  | "focus-dip"
  | "posture-alert"
  | "movement-burst"
  | "gesture"
  | "break-taken"
  | "recommendation-followed";

export interface BehaviorTimelineEvent {
  id: string;
  type: BehaviorEventType;
  timestamp: string;
  label: string;
  description?: string;
}

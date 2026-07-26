import type { KvlClient } from "../client";
import type { GestureType } from "./tracking";

export interface SummaryParams {
  /** Start date, YYYY-MM-DD inclusive. Defaults server-side to 7 days ago. */
  from?: string;
  /** End date, YYYY-MM-DD inclusive. Defaults server-side to today. */
  to?: string;
  userId?: string;
}

/** Totals and averages over a date range, aggregated from `AnalyticsSnapshot` rows. */
export interface AnalyticsSummary {
  from: string;
  to: string;
  daysCovered: number;
  activeMinutesTotal: number;
  sessionsCompletedTotal: number;
  repsTotalTotal: number;
  avgFormScore: number;
  avgFocusScore: number;
  avgPostureScore: number;
}

export interface ListDailyParams {
  userId?: string;
  cursor?: string;
  limit?: number;
}

/** One `AnalyticsSnapshot` row — a single day's rollup for a user. */
export interface AnalyticsSnapshot {
  id: string;
  orgId: string;
  userId: string;
  date: string;
  activeMinutes: number;
  sessionsCompleted: number;
  repsTotal: number;
  avgFormScore: number;
  focusScore: number;
  postureScore: number;
}

export interface InsightsParams {
  userId?: string;
}

export type InsightTone = "positive" | "neutral" | "attention";

/** A deterministic, rule-based comparison over real snapshot data (recent-vs-previous window averages, decline streaks) — not AI/ML-generated. */
export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  description: string;
}

export interface ApiUsageParams {
  /** How many days back to aggregate, 1-90. Defaults server-side to 7. */
  days?: number;
}

export interface ApiUsageTopEndpoint {
  method: string;
  path: string;
  count: number;
}

export interface ApiUsageMethodCount {
  method: string;
  count: number;
}

export interface ApiUsageDeviceCount {
  label: string;
  count: number;
}

export interface ApiUsageMinuteBucket {
  minute: string;
  count: number;
}

/** Real API usage analytics for the caller's org, aggregated from `ApiRequestLog`. Headline totals are always exact; `sampled` is true when the per-row breakdowns below were computed over a bounded recent sample instead of the full range. */
export interface ApiUsageSummary {
  rangeDays: number;
  sampled: boolean;
  totalRequests: number;
  successRate: number | null;
  errorRate: number | null;
  avgLatencyMs: number | null;
  requestsByStatusClass: Record<string, number>;
  topEndpoints: ApiUsageTopEndpoint[];
  byMethod: ApiUsageMethodCount[];
  deviceBreakdown: ApiUsageDeviceCount[];
  requestsPerMinuteRecent: ApiUsageMinuteBucket[];
}

export type TrendDirection = "improving" | "stable" | "declining";
export type EngagementLevel = "highly-engaged" | "engaged" | "moderately-engaged" | "distracted";
export type AlignmentQuality = "excellent" | "good" | "fair" | "needs-improvement";
export type EnergyLevel = "high" | "moderate" | "low";
export type FatigueLevel = "low" | "moderate" | "high";
export type DrowsinessStatus = "alert" | "slightly-tired" | "drowsy";

/** Today's (or, absent any activity today, the most recent active day's) attention rollup. */
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

/** Today's (or most recent active day's) posture rollup. */
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

/** Today's (or most recent active day's) fatigue/wellness rollup. */
export interface FatigueSnapshot {
  energyLevel: EnergyLevel;
  fatigueTrend: TrendDirection;
  recoveryTrend: TrendDirection;
  eyeFatigueLevel: FatigueLevel;
  bodyFatigueLevel: FatigueLevel;
  longSessionAlert: boolean;
  drowsinessStatus: DrowsinessStatus;
  microsleepEventsToday: number;
  /** A clearly-labeled estimate (not a precise measurement) — same convention as calorie estimates elsewhere in the API. */
  focusRecoveryMinutes: number;
}

export interface FatigueTrendPoint {
  label: string;
  energyScore: number;
}

/** An `ExerciseSet` row from the trailing 7 days, reshaped for the analytics dashboard. */
export interface ExerciseSetSummary {
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

/** Same 7 literals as the browser's gesture classifier ("hand" tracking mode only). */
/** A single gesture event from the trailing 72 hours. */
export interface GestureEvent {
  id: string;
  type: GestureType;
  timestamp: string;
  sessionLabel: string;
}

/** Always all 7 gesture types, zero-filled, sorted by count descending. */
export interface GestureSummary {
  type: GestureType;
  count: number;
}

export type MovementActivity = "walking" | "standing" | "sitting" | "running" | "idle";

/** Always all 5 movement states, zero-filled, sorted by minutes descending ("pose" tracking mode only). */
export interface MovementPatternPoint {
  activity: MovementActivity;
  minutes: number;
}

export interface ActivityQualityPoint {
  label: string;
  quality: number;
}

/**
 * `client.analytics` — read-side aggregates and derived dashboards over
 * `AnalyticsSnapshot` / `TrackingMetricSample` / `TrackingEvent` /
 * `ExerciseSet` data. Mirrors the `GET /api/v1/analytics/*` routes.
 * Every score/insight here is a deterministic, real-data computation —
 * none of it is AI/ML-generated.
 */
export class AnalyticsResource {
  constructor(private client: KvlClient) {}

  /** Totals and averages over a date range (default: trailing 7 days). Mirrors `GET /analytics/summary`. */
  summary(params: SummaryParams = {}): Promise<AnalyticsSummary> {
    return this.client.request({ method: "GET", path: "/analytics/summary", query: { ...params } });
  }

  /**
   * Raw daily snapshots, sorted by date descending. Note: the real route
   * paginates via `nextCursor`/`total` in the response envelope's `meta`,
   * which isn't surfaced by `client.request()`'s unwrapped return value in
   * this SDK version — only the page of items is returned here. Mirrors
   * `GET /analytics/daily`.
   */
  listDaily(params: ListDailyParams = {}): Promise<AnalyticsSnapshot[]> {
    return this.client.request({ method: "GET", path: "/analytics/daily", query: { ...params } });
  }

  /** 0-4 deterministic, rule-based insights derived from recent snapshot trends. Mirrors `GET /analytics/insights`. */
  insights(params: InsightsParams = {}): Promise<Insight[]> {
    return this.client.request({
      method: "GET",
      path: "/analytics/insights",
      query: { ...params },
    });
  }

  /** This org's real API request/latency/error analytics, aggregated from `ApiRequestLog`. Mirrors `GET /analytics/api-usage`. */
  apiUsage(params: ApiUsageParams = {}): Promise<ApiUsageSummary> {
    return this.client.request({
      method: "GET",
      path: "/analytics/api-usage",
      query: { ...params },
    });
  }

  /** The caller's current attention snapshot. Mirrors `GET /analytics/attention`. */
  attentionSnapshot(): Promise<AttentionSnapshot> {
    return this.client.request({ method: "GET", path: "/analytics/attention" });
  }

  /** Hour-by-hour focus score for the active day. Mirrors `GET /analytics/attention/timeline`. */
  focusTimeline(): Promise<FocusTimelinePoint[]> {
    return this.client.request({ method: "GET", path: "/analytics/attention/timeline" });
  }

  /** Distraction events recorded during the active day. Mirrors `GET /analytics/attention/distractions`. */
  distractionEvents(): Promise<DistractionEvent[]> {
    return this.client.request({ method: "GET", path: "/analytics/attention/distractions" });
  }

  /** The caller's current posture snapshot. Mirrors `GET /analytics/posture`. */
  postureSnapshot(): Promise<PostureSnapshot> {
    return this.client.request({ method: "GET", path: "/analytics/posture" });
  }

  /** 7-day daily posture score trend. Mirrors `GET /analytics/posture/trend`. */
  postureTrend(): Promise<PostureTrendPoint[]> {
    return this.client.request({ method: "GET", path: "/analytics/posture/trend" });
  }

  /** The caller's current fatigue/wellness snapshot. Mirrors `GET /analytics/fatigue`. */
  fatigueSnapshot(): Promise<FatigueSnapshot> {
    return this.client.request({ method: "GET", path: "/analytics/fatigue" });
  }

  /** 7-day daily energy-score trend (inverse of fatigue). Mirrors `GET /analytics/fatigue/trend`. */
  fatigueTrend(): Promise<FatigueTrendPoint[]> {
    return this.client.request({ method: "GET", path: "/analytics/fatigue/trend" });
  }

  /** Exercise sets from the trailing 7 days ("pose" tracking mode only). Mirrors `GET /analytics/exercise-sets`. */
  exerciseSets(): Promise<ExerciseSetSummary[]> {
    return this.client.request({ method: "GET", path: "/analytics/exercise-sets" });
  }

  /** 7-day daily total-reps trend. Mirrors `GET /analytics/exercise-sets/workout-trend`. */
  workoutTrend(): Promise<WorkoutTrendPoint[]> {
    return this.client.request({ method: "GET", path: "/analytics/exercise-sets/workout-trend" });
  }

  /** Gesture counts by type over the trailing 72 hours ("hand" tracking mode only). Mirrors `GET /analytics/gestures/summaries`. */
  gestureSummaries(): Promise<GestureSummary[]> {
    return this.client.request({ method: "GET", path: "/analytics/gestures/summaries" });
  }

  /** Individual gesture events over the trailing 72 hours ("hand" tracking mode only). Mirrors `GET /analytics/gestures/events`. */
  gestureEvents(): Promise<GestureEvent[]> {
    return this.client.request({ method: "GET", path: "/analytics/gestures/events" });
  }

  /** Minutes spent in each movement state today ("pose" tracking mode only). Mirrors `GET /analytics/movement/pattern`. */
  movementPattern(): Promise<MovementPatternPoint[]> {
    return this.client.request({ method: "GET", path: "/analytics/movement/pattern" });
  }

  /** 7-day daily activity-quality-score trend (blends attention with active-movement fraction). Mirrors `GET /analytics/movement/quality-trend`. */
  activityQualityTrend(): Promise<ActivityQualityPoint[]> {
    return this.client.request({ method: "GET", path: "/analytics/movement/quality-trend" });
  }
}

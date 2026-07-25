/**
 * Public contract for the activity-intelligence feature — a premium,
 * business-language view of WHAT the tracked person is doing right now and
 * over time (walking/standing/smiling/waving/etc), distinct from
 * `@/features/session-analytics` (single live session control center),
 * `@/features/reporting` (aggregate historical BI), and
 * `@/features/session-management` (session library/replay). Reuses the
 * `Insight`/`InsightCard` vocabulary from reporting rather than redefining
 * it, since the shape and tone rules are identical.
 */

import type { Insight } from "@/features/reporting";

export type { Insight };

/** The full activity vocabulary this module tracks — posture states plus discrete gesture/expression events. */
export type ActivityKind =
  | "walking"
  | "standing"
  | "sitting"
  | "running"
  | "jumping"
  | "raise-hand"
  | "wave"
  | "smile"
  | "blink"
  | "head-movement"
  | "hand-movement"
  | "body-movement"
  | "idle"
  | "unknown";

export type ActivityDetectionState =
  "active" | "inactive" | "detected" | "searching" | "completed" | "paused" | "unavailable";

/** Professional confidence vocabulary — never a raw percentage in the UI. */
export type ConfidenceLevel =
  "excellent" | "good" | "moderate" | "limited" | "searching" | "offline";

export type TrendDirection = "up" | "down" | "flat";

export interface LiveActivityCard {
  kind: ActivityKind;
  status: ActivityDetectionState;
  confidence: ConfidenceLevel;
  startedAt: string | null;
  durationSeconds: number;
  lastUpdated: string;
  trend: TrendDirection;
  trendLabel: string;
}

export type ActivityTimelineEventType =
  | "activity-started"
  | "activity-changed"
  | "walking-started"
  | "standing-started"
  | "running-started"
  | "smile-detected"
  | "blink-detected"
  | "hand-raised"
  | "wave-detected"
  | "activity-finished";

export interface ActivityTimelineEvent {
  id: string;
  type: ActivityTimelineEventType;
  kind: ActivityKind;
  timestamp: string;
  label: string;
  description?: string;
}

export interface ActivityHistoryEntry {
  id: string;
  kind: ActivityKind;
  date: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  confidence: ConfidenceLevel;
  sessionId: string;
  sessionName: string;
  favorite: boolean;
}

export type ActivityDatePreset = "today" | "yesterday" | "7d" | "30d" | "all";

export interface ActivityFilters {
  search: string;
  kind: ActivityKind | "all";
  status: ActivityDetectionState | "all";
  datePreset: ActivityDatePreset;
}

export const DEFAULT_ACTIVITY_FILTERS: ActivityFilters = {
  search: "",
  kind: "all",
  status: "all",
  datePreset: "7d",
};

export interface ActivityStatistics {
  totalActivities: number;
  currentActivity: ActivityKind | null;
  totalDurationMinutes: number;
  averageDurationMinutes: number;
  movementCount: number;
  smileCount: number;
  blinkCount: number;
  handRaiseCount: number;
  waveCount: number;
  mostActiveSession: string;
  averageTrackingQuality: ConfidenceLevel;
}

export interface ActivityDistributionPoint {
  kind: ActivityKind;
  minutes: number;
}

export interface MovementTrendPoint {
  label: string;
  count: number;
}

export interface DailyActivityPoint {
  label: string;
  minutes: number;
}

export interface ActivityHeatmapPoint {
  hour: string;
  day: string;
  count: number;
}

export type SummaryPeriod = "daily" | "weekly" | "monthly";

export interface ActivitySummary {
  period: SummaryPeriod;
  mostFrequentActivity: ActivityKind;
  longestActivity: { kind: ActivityKind; minutes: number };
  mostActiveHour: string;
  leastActivePeriod: string;
  totalMinutes: number;
}

/**
 * Public contract for the session-analytics feature. Decoupled from
 * `@/features/camera` and `@/features/tracking` — the page reads live
 * status from those and feeds it in via `useSessionRecorder`, rather than
 * this feature importing their internals directly.
 */

export type SessionStatus = "idle" | "running" | "paused" | "completed";

export type TimelineEventType =
  | "session-started"
  | "tracking-started"
  | "tracking-paused"
  | "tracking-resumed"
  | "face-found"
  | "face-lost"
  | "hand-found"
  | "hand-lost"
  | "session-ended";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: number;
  label: string;
  description?: string;
}

export type ActivityType = "standing" | "walking" | "running" | "sitting" | "idle";

export interface ActivitySample {
  activity: ActivityType;
  timestamp: number;
}

export interface CurrentSession {
  id: string;
  startedAt: number | null;
  status: SessionStatus;
}

/** Professional quality vocabulary shared with the tracking status badge — no percentages. */
export type QualityLevel = "excellent" | "good" | "limited" | "searching" | "offline";

export interface QualityTrendPoint {
  label: string;
  quality: number; // 0-100 internal score used only to draw the trend; never rendered as a raw number in the UI
}

export interface MovementDistributionPoint {
  activity: ActivityType;
  minutes: number;
}

export interface SessionDurationPoint {
  label: string;
  minutes: number;
}

export type SummaryPeriod = "daily" | "weekly" | "monthly";

export interface PeriodSummary {
  period: SummaryPeriod;
  totalSessions: number;
  totalMinutes: number;
  averageQuality: QualityLevel;
  trend: SessionDurationPoint[];
}

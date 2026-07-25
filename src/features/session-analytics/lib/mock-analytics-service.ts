/**
 * Placeholder historical analytics — no backend exists yet. Promise-based
 * with artificial latency so the dashboard genuinely exercises React Query's
 * loading/error states rather than resolving synchronously.
 */

import type {
  MovementDistributionPoint,
  PeriodSummary,
  QualityTrendPoint,
  SessionDurationPoint,
  SummaryPeriod,
} from "../types";

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const QUALITY_TREND: QualityTrendPoint[] = [
  { label: "Mon", quality: 72 },
  { label: "Tue", quality: 78 },
  { label: "Wed", quality: 81 },
  { label: "Thu", quality: 76 },
  { label: "Fri", quality: 85 },
  { label: "Sat", quality: 88 },
  { label: "Sun", quality: 90 },
];

const MOVEMENT_DISTRIBUTION: MovementDistributionPoint[] = [
  { activity: "sitting", minutes: 65 },
  { activity: "standing", minutes: 42 },
  { activity: "walking", minutes: 28 },
  { activity: "idle", minutes: 16 },
  { activity: "running", minutes: 9 },
];

const SESSION_DURATION_TREND: SessionDurationPoint[] = [
  { label: "Mon", minutes: 34 },
  { label: "Tue", minutes: 48 },
  { label: "Wed", minutes: 41 },
  { label: "Thu", minutes: 55 },
  { label: "Fri", minutes: 62 },
  { label: "Sat", minutes: 24 },
  { label: "Sun", minutes: 18 },
];

const PERIOD_TOTALS: Record<
  SummaryPeriod,
  Pick<PeriodSummary, "totalSessions" | "totalMinutes" | "averageQuality">
> = {
  daily: { totalSessions: 3, totalMinutes: 87, averageQuality: "good" },
  weekly: { totalSessions: 14, totalMinutes: 412, averageQuality: "good" },
  monthly: { totalSessions: 52, totalMinutes: 1680, averageQuality: "excellent" },
};

export function fetchQualityTrend(): Promise<QualityTrendPoint[]> {
  return delay(QUALITY_TREND);
}

export function fetchMovementDistribution(): Promise<MovementDistributionPoint[]> {
  return delay(MOVEMENT_DISTRIBUTION);
}

export function fetchSessionDurationTrend(): Promise<SessionDurationPoint[]> {
  return delay(SESSION_DURATION_TREND);
}

export function fetchPeriodSummary(period: SummaryPeriod): Promise<PeriodSummary> {
  return delay({ period, trend: SESSION_DURATION_TREND, ...PERIOD_TOTALS[period] });
}

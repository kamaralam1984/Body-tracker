/**
 * Placeholder historical/aggregate data — no backend exists yet. Same
 * artificial-latency Promise convention as
 * `@/features/session-analytics/lib/mock-analytics-service`, so React Query
 * genuinely exercises loading/error states.
 */

import type { ActivityType, QualityLevel } from "@/features/session-analytics";
import type {
  ComparisonResult,
  DetectionRates,
  DetectionTimelinePoint,
  HeatmapPoint,
  MovementFrequencyPoint,
  PeriodAnalytics,
  SessionHistoryRow,
  SummaryPeriod,
} from "../types";

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function comparison(
  label: string,
  current: number,
  previous: number,
  unit: ComparisonResult["unit"],
  higherIsBetter = true,
): ComparisonResult {
  const changePercent =
    previous === 0 ? 0 : Math.round(((current - previous) / previous) * 1000) / 10;
  const direction = changePercent > 0.5 ? "up" : changePercent < -0.5 ? "down" : "flat";
  return { label, current, previous, changePercent, direction, higherIsBetter, unit };
}

const PERIOD_TREND: Record<SummaryPeriod, { label: string; minutes: number }[]> = {
  daily: [
    { label: "6am", minutes: 4 },
    { label: "9am", minutes: 18 },
    { label: "12pm", minutes: 12 },
    { label: "3pm", minutes: 22 },
    { label: "6pm", minutes: 15 },
    { label: "9pm", minutes: 8 },
  ],
  weekly: [
    { label: "Mon", minutes: 34 },
    { label: "Tue", minutes: 48 },
    { label: "Wed", minutes: 41 },
    { label: "Thu", minutes: 55 },
    { label: "Fri", minutes: 62 },
    { label: "Sat", minutes: 24 },
    { label: "Sun", minutes: 18 },
  ],
  monthly: [
    { label: "Week 1", minutes: 210 },
    { label: "Week 2", minutes: 265 },
    { label: "Week 3", minutes: 198 },
    { label: "Week 4", minutes: 312 },
  ],
};

const PERIOD_META: Record<
  SummaryPeriod,
  { totalSessions: number; totalMinutes: number; averageQuality: QualityLevel }
> = {
  daily: { totalSessions: 3, totalMinutes: 79, averageQuality: "good" },
  weekly: { totalSessions: 14, totalMinutes: 282, averageQuality: "good" },
  monthly: { totalSessions: 52, totalMinutes: 985, averageQuality: "excellent" },
};

const PERIOD_PREVIOUS: Record<SummaryPeriod, { totalSessions: number; totalMinutes: number }> = {
  daily: { totalSessions: 2, totalMinutes: 61 },
  weekly: { totalSessions: 11, totalMinutes: 244 },
  monthly: { totalSessions: 45, totalMinutes: 861 },
};

export function fetchPeriodAnalytics(period: SummaryPeriod): Promise<PeriodAnalytics> {
  const meta = PERIOD_META[period];
  const prev = PERIOD_PREVIOUS[period];
  return delay({
    period,
    ...meta,
    trend: PERIOD_TREND[period],
    comparison: [
      comparison("Sessions", meta.totalSessions, prev.totalSessions, "count"),
      comparison("Minutes tracked", meta.totalMinutes, prev.totalMinutes, "minutes"),
    ],
  });
}

const DETECTION_RATES: DetectionRates = { face: 92, hand: 74, pose: 81 };
const DETECTION_RATES_PREVIOUS: DetectionRates = { face: 88, hand: 70, pose: 83 };

export function fetchDetectionRates(): Promise<DetectionRates> {
  return delay(DETECTION_RATES);
}

export function fetchDetectionComparison(): Promise<ComparisonResult[]> {
  return delay([
    comparison(
      "Face detection rate",
      DETECTION_RATES.face,
      DETECTION_RATES_PREVIOUS.face,
      "percent",
    ),
    comparison(
      "Hand detection rate",
      DETECTION_RATES.hand,
      DETECTION_RATES_PREVIOUS.hand,
      "percent",
    ),
    comparison(
      "Pose detection rate",
      DETECTION_RATES.pose,
      DETECTION_RATES_PREVIOUS.pose,
      "percent",
    ),
  ]);
}

const DETECTION_TIMELINE: DetectionTimelinePoint[] = [
  { label: "Mon", face: 90, hand: 70, pose: 78 },
  { label: "Tue", face: 91, hand: 72, pose: 80 },
  { label: "Wed", face: 88, hand: 68, pose: 76 },
  { label: "Thu", face: 93, hand: 75, pose: 82 },
  { label: "Fri", face: 95, hand: 78, pose: 85 },
  { label: "Sat", face: 89, hand: 71, pose: 79 },
  { label: "Sun", face: 92, hand: 74, pose: 81 },
];

export function fetchDetectionTimeline(): Promise<DetectionTimelinePoint[]> {
  return delay(DETECTION_TIMELINE);
}

const MOVEMENT_FREQUENCY: MovementFrequencyPoint[] = [
  { activity: "sitting", occurrences: 42 },
  { activity: "standing", occurrences: 31 },
  { activity: "walking", occurrences: 19 },
  { activity: "idle", occurrences: 12 },
  { activity: "running", occurrences: 6 },
];

export function fetchMovementFrequency(): Promise<MovementFrequencyPoint[]> {
  return delay(MOVEMENT_FREQUENCY);
}

const ACTIVITIES: ActivityType[] = ["standing", "walking", "running", "sitting", "idle"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const ACTIVITY_HEATMAP: HeatmapPoint[] = DAYS.flatMap((day, dayIndex) =>
  Array.from({ length: 24 }, (_, hour) => {
    const seed = dayIndex * 24 + hour;
    const base = hour >= 8 && hour <= 20 ? 55 : 12;
    const value = Math.round(Math.min(100, Math.max(0, base + seededRandom(seed) * 45 - 15)));
    return { day, hour, value };
  }),
);

export function fetchActivityHeatmap(): Promise<HeatmapPoint[]> {
  return delay(ACTIVITY_HEATMAP, 650);
}

const QUALITY_CYCLE: QualityLevel[] = ["excellent", "good", "good", "limited", "excellent"];
const STATUS_CYCLE: SessionHistoryRow["status"][] = [
  "completed",
  "completed",
  "completed",
  "interrupted",
];

const SESSION_HISTORY: SessionHistoryRow[] = Array.from({ length: 24 }, (_, i) => {
  const daysAgo = Math.floor(i / 2);
  const date = new Date(Date.now() - daysAgo * 86_400_000);
  return {
    id: `SESSION-${1000 + i}`,
    date: date.toISOString().slice(0, 10),
    startTime: `${String(8 + (i % 10)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`,
    durationMinutes: 12 + ((i * 7) % 48),
    quality: QUALITY_CYCLE[i % QUALITY_CYCLE.length],
    activity: ACTIVITIES[i % ACTIVITIES.length],
    status: STATUS_CYCLE[i % STATUS_CYCLE.length],
  };
});

export function fetchSessionHistory(): Promise<SessionHistoryRow[]> {
  return delay(SESSION_HISTORY, 600);
}

export function fetchSessionStats(): Promise<{
  average: number;
  longest: number;
  shortest: number;
}> {
  const durations = SESSION_HISTORY.map((s) => s.durationMinutes);
  return delay({
    average: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    longest: Math.max(...durations),
    shortest: Math.min(...durations),
  });
}

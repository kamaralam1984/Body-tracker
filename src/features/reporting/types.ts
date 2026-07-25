/**
 * Public contract for the reporting feature (insights, comparisons, session
 * history, heatmaps, report generation, export). Builds on top of
 * `@/features/session-analytics`'s vocabulary (ActivityType, QualityLevel,
 * SummaryPeriod) rather than redefining it.
 */

import type { ActivityType, QualityLevel, SummaryPeriod } from "@/features/session-analytics";

export type { SummaryPeriod };

export type ReportType =
  | "executive"
  | "daily"
  | "weekly"
  | "monthly"
  | "session"
  | "performance"
  | "tracking"
  | "movement"
  | "custom";

export type ExportFormat = "csv" | "excel" | "pdf" | "print";

export type InsightTone = "positive" | "negative" | "neutral";

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  description: string;
}

export interface ComparisonResult {
  label: string;
  current: number;
  previous: number;
  changePercent: number;
  direction: "up" | "down" | "flat";
  /** Whether an "up" direction is the desirable outcome for this metric (false for e.g. error rate). */
  higherIsBetter: boolean;
  /** How to render `current`/`previous` — a plain count, minutes, or a percentage. */
  unit: "count" | "minutes" | "percent";
}

export interface DetectionRates {
  face: number;
  hand: number;
  pose: number;
}

export interface DetectionTimelinePoint {
  label: string;
  face: number;
  hand: number;
  pose: number;
}

export interface MovementFrequencyPoint {
  activity: ActivityType;
  occurrences: number;
}

export interface HeatmapPoint {
  day: string;
  hour: number;
  value: number;
}

export interface SessionHistoryRow {
  id: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  quality: QualityLevel;
  activity: ActivityType;
  status: "completed" | "interrupted";
}

export interface PeriodAnalytics {
  period: SummaryPeriod;
  totalSessions: number;
  totalMinutes: number;
  averageQuality: QualityLevel;
  trend: { label: string; minutes: number }[];
  comparison: ComparisonResult[];
}

export interface ReportDefinition {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  generatedAt: string;
  period?: SummaryPeriod;
}

export interface ExecutiveSummaryData {
  performanceScore: number;
  kpis: ComparisonResult[];
  insights: Insight[];
}

/**
 * Public contract for the report-center feature — a document library/hub
 * (Dropbox/Notion-style) that sits ON TOP OF `@/features/reporting`'s
 * analytics engine rather than duplicating it. `@/features/reporting`
 * computes the numbers (insights, comparisons, session history, charts);
 * this feature is concerned with treating a *rendering* of those numbers as
 * a saved, browsable, exportable document — library, templates, history,
 * viewer, PDF/CSV/Excel export.
 */

import type { ExportFormat, ReportType, SummaryPeriod } from "@/features/reporting";

export type { ExportFormat, SummaryPeriod };

/** Superset of `@/features/reporting`'s `ReportType` — adds the report kinds Phase 9 asks for that the analytics engine doesn't itself compute. */
export type ReportKind = ReportType | "quarterly" | "annual" | "activity" | "comparison";

export type ReportTemplate = "executive" | "professional" | "compact" | "detailed";
export type ReportOrientation = "portrait" | "landscape";
export type ReportRecordStatus = "ready" | "generating" | "failed" | "scheduled";

export interface ReportAuthor {
  name: string;
  avatarSrc?: string;
}

export interface ReportRecord {
  id: string;
  title: string;
  kind: ReportKind;
  template: ReportTemplate;
  orientation: ReportOrientation;
  dateRangeLabel: string;
  createdAt: string;
  updatedAt: string;
  generatedBy: ReportAuthor;
  status: ReportRecordStatus;
  favorite: boolean;
  shared: boolean;
  archived: boolean;
  scheduled: boolean;
  fileSizeKb: number;
  lastExportFormat: ExportFormat | null;
}

export type ReportTabValue =
  "all" | "recent" | "favorites" | "shared" | "scheduled" | "archived" | "templates";

export type ReportDatePreset = "today" | "yesterday" | "7d" | "30d" | "90d" | "all";

export interface ReportFilters {
  search: string;
  kind: ReportKind | "all";
  template: ReportTemplate | "all";
  datePreset: ReportDatePreset;
}

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  search: "",
  kind: "all",
  template: "all",
  datePreset: "all",
};

export type ReportViewMode = "grid" | "table";

export interface ReportStats {
  total: number;
  recent: number;
  favorites: number;
  shared: number;
  scheduled: number;
  archived: number;
}

export interface ReportTemplateOption {
  id: ReportTemplate;
  label: string;
  description: string;
  sectionCount: number;
}

export interface NewReportDraft {
  title: string;
  kind: ReportKind;
  template: ReportTemplate;
  orientation: ReportOrientation;
  datePreset: ReportDatePreset;
}

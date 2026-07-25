/**
 * Placeholder report-library data — no backend exists yet. Deterministic
 * (seeded) generation, same artificial-latency Promise convention used by
 * every other mock service in this app.
 */

import type {
  ReportAuthor,
  ReportKind,
  ReportOrientation,
  ReportRecord,
  ReportRecordStatus,
  ReportStats,
  ReportTemplate,
} from "../types";

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.floor(seededRandom(seed) * items.length) % items.length];
}

export const REPORT_KINDS: ReportKind[] = [
  "executive",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "annual",
  "session",
  "tracking",
  "activity",
  "performance",
  "movement",
  "comparison",
  "custom",
];

export const REPORT_KIND_LABEL: Record<ReportKind, string> = {
  executive: "Executive Summary",
  daily: "Daily Report",
  weekly: "Weekly Report",
  monthly: "Monthly Report",
  quarterly: "Quarterly Report",
  annual: "Annual Report",
  session: "Session Report",
  tracking: "Tracking Report",
  activity: "Activity Report",
  performance: "Performance Report",
  movement: "Movement Report",
  comparison: "Comparison Report",
  custom: "Custom Report",
};

export const REPORT_TEMPLATES: ReportTemplate[] = [
  "executive",
  "professional",
  "compact",
  "detailed",
];

export const REPORT_TEMPLATE_META: Record<
  ReportTemplate,
  { label: string; description: string; sectionCount: number }
> = {
  executive: {
    label: "Executive",
    description: "Cover page, KPI summary, and top insights — built for leadership review.",
    sectionCount: 4,
  },
  professional: {
    label: "Professional",
    description: "Full analytics: overview, trends, movement, detection, and session history.",
    sectionCount: 7,
  },
  compact: {
    label: "Compact",
    description: "A single-page snapshot of key metrics and one headline chart.",
    sectionCount: 2,
  },
  detailed: {
    label: "Detailed",
    description: "Every section, every table — the complete audit-ready record.",
    sectionCount: 9,
  },
};

const AUTHORS: ReportAuthor[] = [
  { name: "Sarah Chen" },
  { name: "Marcus Webb" },
  { name: "Priya Nair" },
  { name: "Diego Alvarez" },
  { name: "Elena Kowalski" },
  { name: "Jordan Rivera" },
];

function titleFor(kind: ReportKind, dateRangeLabel: string): string {
  return `${REPORT_KIND_LABEL[kind]} — ${dateRangeLabel}`;
}

function dateRangeLabelFor(kind: ReportKind, start: Date, end: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (kind === "daily") return fmt(start);
  if (kind === "annual") return String(start.getFullYear());
  return `${fmt(start)}–${fmt(end)}`;
}

const TOTAL_REPORTS = 48;

function buildReports(): ReportRecord[] {
  const now = Date.now();
  return Array.from({ length: TOTAL_REPORTS }, (_, i) => {
    const seed = i * 19 + 11;
    const kind = pick(REPORT_KINDS, seed);
    const template = pick(REPORT_TEMPLATES, seed + 1);
    const orientation: ReportOrientation = seededRandom(seed + 2) > 0.75 ? "landscape" : "portrait";
    const daysAgo = Math.floor(seededRandom(seed + 3) * 90);
    const isScheduled = seededRandom(seed + 4) > 0.93;
    const createdAt = new Date(now - (isScheduled ? -daysAgo : daysAgo) * 86_400_000);
    const spanDays =
      kind === "daily"
        ? 0
        : kind === "weekly"
          ? 6
          : kind === "monthly"
            ? 29
            : kind === "quarterly"
              ? 89
              : kind === "annual"
                ? 364
                : 6;
    const rangeStart = new Date(createdAt.getTime() - spanDays * 86_400_000);
    const dateRangeLabel = dateRangeLabelFor(kind, rangeStart, createdAt);

    const statusRoll = seededRandom(seed + 5);
    let status: ReportRecordStatus;
    if (isScheduled) status = "scheduled";
    else if (statusRoll > 0.97) status = "failed";
    else if (statusRoll > 0.94) status = "generating";
    else status = "ready";

    return {
      id: `RPT-${3000 + i}`,
      title: titleFor(kind, dateRangeLabel),
      kind,
      template,
      orientation,
      dateRangeLabel,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
      generatedBy: pick(AUTHORS, seed + 6),
      status,
      favorite: seededRandom(seed + 7) > 0.87,
      shared: seededRandom(seed + 8) > 0.82,
      archived: !isScheduled && daysAgo > 60 && seededRandom(seed + 9) > 0.6,
      scheduled: isScheduled,
      fileSizeKb: 180 + Math.floor(seededRandom(seed + 10) * 900),
      lastExportFormat:
        status === "ready" ? pick(["pdf", "csv", "excel", "print"] as const, seed + 11) : null,
    } satisfies ReportRecord;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

const REPORTS = buildReports();

export function fetchReports(): Promise<ReportRecord[]> {
  return delay(REPORTS, 550);
}

export function fetchReportById(id: string): Promise<ReportRecord | null> {
  return delay(REPORTS.find((r) => r.id === id) ?? null, 300);
}

export function computeReportStats(reports: ReportRecord[]): ReportStats {
  const now = Date.now();
  return {
    total: reports.length,
    recent: reports.filter(
      (r) => now - new Date(r.createdAt).getTime() < 7 * 86_400_000 && !r.scheduled,
    ).length,
    favorites: reports.filter((r) => r.favorite).length,
    shared: reports.filter((r) => r.shared).length,
    scheduled: reports.filter((r) => r.scheduled).length,
    archived: reports.filter((r) => r.archived).length,
  };
}

/** Only used by `report-query.ts`'s search — kept here since it owns the label table. */
export function reportSearchHaystack(report: ReportRecord): string {
  return `${report.title} ${REPORT_KIND_LABEL[report.kind]} ${report.generatedBy.name} ${report.id}`.toLowerCase();
}

export { REPORT_KIND_LABEL as KIND_LABEL };

let idCounter = REPORTS.length;
export function createReportRecord(input: {
  title: string;
  kind: ReportKind;
  template: ReportTemplate;
  orientation: ReportOrientation;
  dateRangeLabel: string;
}): ReportRecord {
  idCounter += 1;
  const now = new Date().toISOString();
  return {
    id: `RPT-${3000 + idCounter}`,
    title: input.title,
    kind: input.kind,
    template: input.template,
    orientation: input.orientation,
    dateRangeLabel: input.dateRangeLabel,
    createdAt: now,
    updatedAt: now,
    generatedBy: { name: "You" },
    status: "ready",
    favorite: false,
    shared: false,
    archived: false,
    scheduled: false,
    fileSizeKb: 220,
    lastExportFormat: null,
  };
}

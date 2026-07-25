import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalyticsSnapshot, Report } from "@/server/db/entities";

/**
 * Report content generation for the Reports domain.
 *
 * `reportContents` is a private, module-level cache of generated file
 * bytes, keyed by report id. It intentionally lives here and NOT on the
 * shared `Store` — generated file bytes are a derived artifact, not
 * authoritative data, so we keep them out of the core persistence layer.
 * Being module-level (not per-request) means the cache survives across
 * requests within the same server process but is lost on a dev-server
 * restart, same as any other in-memory cache; `getOrGenerateReportContent`
 * transparently regenerates from the underlying snapshots when that
 * happens, since generation is fully deterministic given the same inputs.
 */
const reportContents = new Map<string, Buffer>();

/**
 * PDF strategy note: jsPDF (already a project dependency, used client-side
 * in `@/features/report-center/lib/pdf-engine.ts`) was verified to work
 * fine when imported and invoked directly inside a plain Node.js process —
 * `new jsPDF()` + `jspdf-autotable`'s `autoTable()` + `doc.output("arraybuffer")`
 * all ran without touching `window`/`document`. Next.js Route Handlers run
 * under the Node.js runtime by default, so the same call path is used here
 * unmodified rather than hand-rolling a raw PDF byte stream.
 */
function buildPdfBuffer(report: Report, snapshots: AnalyticsSnapshot[]): Buffer {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(report.title, 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Period: ${report.periodStart.slice(0, 10)} to ${report.periodEnd.slice(0, 10)}`,
    14,
    26,
  );
  doc.text(`Generated: ${new Date().toISOString()}`, 14, 32);

  autoTable(doc, {
    startY: 40,
    head: [["Date", "Active Min", "Sessions", "Reps", "Form", "Focus", "Posture"]],
    body: snapshots.map((s) => [
      s.date,
      String(s.activeMinutes),
      String(s.sessionsCompleted),
      String(s.repsTotal),
      String(s.avgFormScore),
      String(s.focusScore),
      String(s.postureScore),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [63, 81, 181] },
  });

  return Buffer.from(doc.output("arraybuffer"));
}

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function buildCsvBuffer(snapshots: AnalyticsSnapshot[]): Buffer {
  const header =
    "date,activeMinutes,sessionsCompleted,repsTotal,avgFormScore,focusScore,postureScore";
  const rows = snapshots.map((s) =>
    [
      s.date,
      s.activeMinutes,
      s.sessionsCompleted,
      s.repsTotal,
      s.avgFormScore,
      s.focusScore,
      s.postureScore,
    ]
      .map(csvEscape)
      .join(","),
  );
  const csv = [header, ...rows].join("\n") + "\n";
  return Buffer.from(csv, "utf8");
}

/** Builds real file bytes for a report from its underlying snapshot rows. Pure function of (report, snapshots) — safe to call repeatedly. */
export function generateReportContent(report: Report, snapshots: AnalyticsSnapshot[]): Buffer {
  if (report.format === "csv") return buildCsvBuffer(snapshots);
  return buildPdfBuffer(report, snapshots);
}

/** Returns the cached buffer for a report if present, else generates it from `snapshots` and caches the result. */
export function getOrGenerateReportContent(report: Report, snapshots: AnalyticsSnapshot[]): Buffer {
  const cached = reportContents.get(report.id);
  if (cached) return cached;

  const buffer = generateReportContent(report, snapshots);
  reportContents.set(report.id, buffer);
  return buffer;
}

"use client";

/**
 * Download/export menu for a single report document — PDF (real
 * multi-section document via the `pdf-engine`), CSV/Excel (session-history
 * object rows via `@/features/reporting`'s export engine), Print, and
 * share/email/copy-link stubs.
 *
 * <ReportDownloadCenter report={report} />
 */

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Link2, Mail, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  exportToCsv,
  exportToExcel,
  printReport,
  useSessionHistoryQuery,
  useSessionStatsQuery,
  type ExportRow,
} from "@/features/reporting";
import { generateReportPdf, type PdfReportDocument, type PdfSection } from "../lib/pdf-engine";
import { formatAbsoluteDate, reportTemplateLabel } from "../lib/report-format";
import type { ReportRecord } from "../types";

function buildSessionRows(
  sessionHistory: ReturnType<typeof useSessionHistoryQuery>["data"],
): ExportRow[] {
  const rows = sessionHistory ?? [];
  return rows.map((r) => ({
    "Session ID": r.id,
    Date: r.date,
    "Start time": r.startTime,
    "Duration (min)": r.durationMinutes,
    Quality: r.quality,
    Activity: r.activity,
    Status: r.status,
  }));
}

export function ReportDownloadCenter({
  report,
  className,
}: {
  report: ReportRecord;
  className?: string;
}) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const sessionHistory = useSessionHistoryQuery();
  const sessionStats = useSessionStatsQuery();

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const rows = sessionHistory.data ?? [];
      const stats = sessionStats.data;

      const overviewSection: PdfSection = {
        heading: "Overview",
        paragraphs: [
          `This document summarizes ${rows.length} recorded session${rows.length === 1 ? "" : "s"} for the ${report.dateRangeLabel} period.`,
        ],
        kpis: [
          { label: "Total sessions", value: String(rows.length) },
          { label: "Avg. duration", value: stats ? `${stats.average} min` : "—" },
          { label: "Longest session", value: stats ? `${stats.longest} min` : "—" },
          { label: "Shortest session", value: stats ? `${stats.shortest} min` : "—" },
        ],
      };

      const historySection: PdfSection = {
        heading: "Session History",
        tables: [
          {
            heading: "Recorded sessions",
            headers: [
              "Session ID",
              "Date",
              "Start time",
              "Duration (min)",
              "Quality",
              "Activity",
              "Status",
            ],
            rows: rows.map((r) => [
              r.id,
              r.date,
              r.startTime,
              r.durationMinutes,
              r.quality,
              r.activity,
              r.status,
            ]),
          },
        ],
      };

      const doc: PdfReportDocument = {
        title: report.title,
        subtitle: report.dateRangeLabel,
        templateLabel: reportTemplateLabel(report.template),
        generatedByName: report.generatedBy.name,
        generatedAtLabel: formatAbsoluteDate(report.createdAt),
        orientation: report.orientation,
        sections: [overviewSection, historySection],
      };

      await generateReportPdf(doc, report.id);
      toast.success("PDF exported");
    } catch {
      toast.error("PDF export failed");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportCsv = () => {
    const rows = buildSessionRows(sessionHistory.data);
    if (rows.length === 0) {
      toast.info("No session data to export yet");
      return;
    }
    exportToCsv(report.id, rows);
    toast.success("CSV exported");
  };

  const handleExportExcel = () => {
    const rows = buildSessionRows(sessionHistory.data);
    if (rows.length === 0) {
      toast.info("No session data to export yet");
      return;
    }
    exportToExcel(report.id, rows);
    toast.success("Excel file exported");
  };

  const handlePrint = () => {
    printReport();
    toast.success("Sent to print");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://bodytracker.app/reports/${report.id}`);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <DropdownMenu
      className={cn(className)}
      trigger={
        <Button type="button" variant="primary">
          {exportingPdf ? <Spinner size="sm" /> : <Download />}
          Download
        </Button>
      }
    >
      <DropdownMenuItem icon={FileText} onSelect={handleExportPdf} disabled={exportingPdf}>
        {exportingPdf ? "Exporting PDF…" : "Export PDF"}
      </DropdownMenuItem>
      <DropdownMenuItem icon={FileText} onSelect={handleExportCsv}>
        Export CSV
      </DropdownMenuItem>
      <DropdownMenuItem icon={FileSpreadsheet} onSelect={handleExportExcel}>
        Export Excel
      </DropdownMenuItem>
      <DropdownMenuItem icon={Printer} onSelect={handlePrint}>
        Print
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem icon={Share2} onSelect={() => toast.info("Sharing isn't connected yet")}>
        Share…
      </DropdownMenuItem>
      <DropdownMenuItem
        icon={Mail}
        onSelect={() => toast.info("Email delivery isn't connected yet")}
      >
        Email report
      </DropdownMenuItem>
      <DropdownMenuItem icon={Link2} onSelect={handleCopyLink}>
        Copy link
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

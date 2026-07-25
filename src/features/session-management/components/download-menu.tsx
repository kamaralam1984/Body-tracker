"use client";

/**
 * "Download" dropdown for a single session — reuses the existing export
 * engine (`@/features/reporting/lib/export-engine.ts`) for CSV/PDF/print,
 * and the new `exportSessionAsJson` (`../lib/session-export.ts`) for the one
 * format that engine doesn't cover. "Copy share link" and "Share…" are
 * honest stand-ins: there's no real sharing backend yet, so the latter just
 * says so via toast rather than pretending to open a share sheet.
 *
 * <DownloadMenu session={session} />
 */

import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Link2,
  Printer,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { exportToCsv, exportToPdf, printReport } from "@/features/reporting/lib/export-engine";
import { exportSessionAsJson } from "../lib/session-export";
import { formatAbsoluteDate, formatDurationLabel, formatFileSize } from "../lib/session-format";
import type { SessionRecord } from "../types";

interface DownloadMenuProps {
  session: SessionRecord;
  className?: string;
}

/** Flattens a session's key fields into an ordered field/value list, shared by the CSV row and the PDF table. */
function buildSessionFields(session: SessionRecord): [string, string | number][] {
  return [
    ["ID", session.id],
    ["Name", session.name],
    ["User", session.user.name],
    ["Organization", session.organization],
    ["Camera", session.camera],
    ["Device", session.device],
    ["Start time", formatAbsoluteDate(session.startTime)],
    ["End time", session.endTime ? formatAbsoluteDate(session.endTime) : "—"],
    ["Duration", formatDurationLabel(session.durationSeconds)],
    ["Quality", session.quality],
    ["Activity", session.activity],
    ["Status", session.status],
    ["Movement summary", session.movementSummary],
    ["Categories", session.categories.join(", ") || "—"],
    ["Tags", session.tags.join(", ") || "—"],
    ["Starred", session.starred ? "Yes" : "No"],
    ["File size", formatFileSize(session.fileSizeMb)],
    ["Storage location", session.storageLocation],
    ["Notes", session.notes || "—"],
    ["Created at", formatAbsoluteDate(session.createdAt)],
    ["Updated at", formatAbsoluteDate(session.updatedAt)],
  ];
}

export function DownloadMenu({ session, className }: DownloadMenuProps) {
  const filename = `session-${session.id}`;

  const handleDownloadJson = () => {
    exportSessionAsJson(session, filename);
    toast.success("Session downloaded as JSON");
  };

  const handleDownloadCsv = () => {
    const row: Record<string, string | number> = Object.fromEntries(buildSessionFields(session));
    exportToCsv(filename, [row]);
    toast.success("Session downloaded as CSV");
  };

  const handleDownloadPdf = () => {
    void exportToPdf(filename, session.name, ["Field", "Value"], buildSessionFields(session)).then(
      () => toast.success("Session report downloaded as PDF"),
    );
  };

  const handlePrint = () => {
    printReport();
    toast.info("Opening print dialog");
  };

  const handleCopyLink = () => {
    const url = `https://bodytracker.app/sessions/${session.id}`;
    void navigator.clipboard.writeText(url).then(() => toast.success("Link copied"));
  };

  const handleShare = () => {
    toast.info("Sharing isn't connected yet");
  };

  return (
    <DropdownMenu
      placement="bottom-end"
      trigger={
        <Button type="button" variant="outline" className={className}>
          <Download className="size-4" strokeWidth={1.75} />
          Download
        </Button>
      }
    >
      <DropdownMenuItem icon={FileJson} onSelect={handleDownloadJson}>
        Download JSON
      </DropdownMenuItem>
      <DropdownMenuItem icon={FileSpreadsheet} onSelect={handleDownloadCsv}>
        Download CSV
      </DropdownMenuItem>
      <DropdownMenuItem icon={FileText} onSelect={handleDownloadPdf}>
        Download PDF report
      </DropdownMenuItem>
      <DropdownMenuItem icon={Printer} onSelect={handlePrint}>
        Print report
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem icon={Link2} onSelect={handleCopyLink}>
        Copy share link
      </DropdownMenuItem>
      <DropdownMenuItem icon={Share2} onSelect={handleShare}>
        Share…
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

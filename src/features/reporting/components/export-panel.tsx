"use client";

/**
 * Small, data-agnostic "Export data" card. The panel itself has no idea what
 * "the current view's data" means — it calls the `getRows` prop, which the
 * parent/page supplies, and forwards the result straight into the real
 * `export-engine.ts` functions (no stubs). PDF export is async, so that
 * button alone tracks a local loading flag and swaps in a `Spinner`.
 */

import { useState } from "react";
import { FileDown, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { exportToCsv, exportToExcel, exportToPdf, printReport } from "../lib/export-engine";

export interface ExportPanelRows {
  headers: string[];
  rows: (string | number)[][];
  objectRows: Record<string, string | number>[];
}

export interface ExportPanelProps {
  getRows: () => ExportPanelRows;
  filenameBase: string;
  className?: string;
}

function titleFromFilename(filenameBase: string): string {
  return filenameBase
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function ExportPanel({ getRows, filenameBase, className }: ExportPanelProps) {
  const [exportingPdf, setExportingPdf] = useState(false);

  function handleCsv() {
    const { objectRows } = getRows();
    exportToCsv(filenameBase, objectRows);
    toast.success("CSV export downloaded");
  }

  function handleExcel() {
    const { objectRows } = getRows();
    exportToExcel(filenameBase, objectRows);
    toast.success("Excel export downloaded");
  }

  async function handlePdf() {
    const { headers, rows } = getRows();
    setExportingPdf(true);
    try {
      await exportToPdf(filenameBase, titleFromFilename(filenameBase), headers, rows);
      toast.success("PDF export downloaded");
    } finally {
      setExportingPdf(false);
    }
  }

  function handlePrint() {
    printReport();
    toast.success("Sent to printer");
  }

  return (
    <Card className={cn("flex flex-col gap-4 p-6", className)}>
      <div className="flex flex-col gap-1">
        <p className="text-foreground text-base font-semibold tracking-tight">Export data</p>
        <p className="text-muted-foreground text-sm">
          Download the current view in your preferred format.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleCsv}>
          <FileText />
          CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handleExcel}>
          <FileSpreadsheet />
          Excel
        </Button>
        <Button variant="outline" size="sm" onClick={handlePdf} disabled={exportingPdf}>
          {exportingPdf ? <Spinner size="sm" /> : <FileDown />}
          PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer />
          Print
        </Button>
      </div>
    </Card>
  );
}

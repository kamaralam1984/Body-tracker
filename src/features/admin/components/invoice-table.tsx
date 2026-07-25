"use client";

/**
 * Invoice table (Stripe "Invoices" page density) — wraps the generic
 * `DataTable<Invoice>`. Per-row "Download PDF" is a REAL client-side PDF
 * export via `exportToPdf` (`@/features/reporting`), not a stub — it
 * generates an actual jsPDF document from the invoice's fields. The bulk
 * "Export all as CSV" button above the table is likewise a real
 * `exportToCsv` call over every visible row.
 *
 * <InvoiceTable invoices={filterInvoices(data, invoiceFilters)} />
 */

import { Download } from "lucide-react";
import { exportToCsv, exportToPdf, type ExportRow } from "@/features/reporting";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency, formatShortDate } from "../lib/admin-format";
import type { Invoice } from "../types";
import { InvoiceStatusBadge } from "./admin-badges";

function handleDownloadPdf(invoice: Invoice) {
  void exportToPdf(
    invoice.number,
    `Invoice ${invoice.number}`,
    ["Field", "Value"],
    [
      ["Amount", formatCurrency(invoice.amount)],
      ["Status", invoice.status],
      ["Period", invoice.periodLabel],
      ["Issued", formatShortDate(invoice.issuedAt)],
      ["Due", formatShortDate(invoice.dueAt)],
    ],
  );
}

function handleExportAllCsv(invoices: Invoice[]) {
  const rows: ExportRow[] = invoices.map((invoice) => ({
    Number: invoice.number,
    Period: invoice.periodLabel,
    Amount: formatCurrency(invoice.amount),
    Status: invoice.status,
    Issued: formatShortDate(invoice.issuedAt),
    Due: formatShortDate(invoice.dueAt),
  }));
  exportToCsv("invoices", rows);
}

export function InvoiceTable({ invoices, className }: { invoices: Invoice[]; className?: string }) {
  const columns: DataTableColumn<Invoice>[] = [
    {
      key: "number",
      header: "Invoice #",
      sortable: true,
      render: (invoice) => (
        <span className="text-foreground font-mono text-sm">{invoice.number}</span>
      ),
    },
    {
      key: "period",
      header: "Period",
      render: (invoice) => <span className="text-sm">{invoice.periodLabel}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      sortValue: (invoice) => invoice.amount,
      render: (invoice) => (
        <span className="text-foreground text-sm font-medium">
          {formatCurrency(invoice.amount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (invoice) => <InvoiceStatusBadge status={invoice.status} />,
    },
    {
      key: "issued",
      header: "Issued",
      sortable: true,
      sortValue: (invoice) => new Date(invoice.issuedAt).getTime(),
      render: (invoice) => (
        <span className="text-muted-foreground text-sm">{formatShortDate(invoice.issuedAt)}</span>
      ),
    },
    {
      key: "due",
      header: "Due",
      render: (invoice) => (
        <span className="text-muted-foreground text-sm">{formatShortDate(invoice.dueAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (invoice) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDownloadPdf(invoice)}
          aria-label={`Download PDF for ${invoice.number}`}
        >
          <Download />
          PDF
        </Button>
      ),
    },
  ];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExportAllCsv(invoices)}
          disabled={invoices.length === 0}
        >
          <Download />
          Export all as CSV
        </Button>
      </div>

      <DataTable
        data={invoices}
        columns={columns}
        getRowId={(invoice) => invoice.id}
        pageSize={10}
        emptyTitle="No invoices"
        emptyDescription="No invoices match the current filters."
      />
    </div>
  );
}

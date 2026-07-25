"use client";

/**
 * Session history table — 3 stat callouts (average/longest/shortest duration,
 * from `useSessionStatsQuery`) above a sortable table of `SessionHistoryRow`s.
 *
 * Table implementation choice: reuses the EXISTING `DataTable<T>` (built on
 * the `Table` primitives, not `@tanstack/react-table`) rather than building a
 * new `@tanstack/react-table`-based grid. The mock dataset here is ~24 rows —
 * far below any threshold where virtualization or `@tanstack/react-table`'s
 * row models would earn their complexity — and this component doesn't need
 * row selection (bulk export/selection isn't part of this table's brief; the
 * `ExportPanel` is intentionally data-agnostic via its `getRows` prop). Reuse
 * keeps this table pixel-identical to every other table in the app for free.
 */

import { Clock, TrendingDown, TrendingUp } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/card-variants";
import { cn } from "@/lib/utils";
import { useSessionHistoryQuery, useSessionStatsQuery } from "../hooks/use-reporting-queries";
import type { SessionHistoryRow } from "../types";
import type { QualityLevel } from "@/features/session-analytics";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/** Mirrors `session-kpi-grid.tsx` / `tracking-status-badge.tsx`'s quality→variant vocabulary. */
const QUALITY_META: Record<QualityLevel, { label: string; variant: BadgeVariant }> = {
  excellent: { label: "Excellent", variant: "success" },
  good: { label: "Good", variant: "success" },
  limited: { label: "Limited", variant: "warning" },
  searching: { label: "Searching…", variant: "info" },
  offline: { label: "Offline", variant: "neutral" },
};

const STATUS_META: Record<SessionHistoryRow["status"], { label: string; variant: BadgeVariant }> = {
  completed: { label: "Completed", variant: "success" },
  interrupted: { label: "Interrupted", variant: "warning" },
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const columns: DataTableColumn<SessionHistoryRow>[] = [
  { key: "id", header: "Session ID", render: (row) => row.id, sortable: true },
  { key: "date", header: "Date", render: (row) => row.date, sortable: true },
  { key: "startTime", header: "Start time", render: (row) => row.startTime, sortable: true },
  {
    key: "durationMinutes",
    header: "Duration",
    render: (row) => `${row.durationMinutes} min`,
    sortable: true,
    sortValue: (row) => row.durationMinutes,
    align: "right",
  },
  {
    key: "quality",
    header: "Quality",
    render: (row) => {
      const meta = QUALITY_META[row.quality];
      return <Badge variant={meta.variant}>{meta.label}</Badge>;
    },
    sortable: true,
    sortValue: (row) => QUALITY_META[row.quality].label,
  },
  {
    key: "activity",
    header: "Activity",
    render: (row) => capitalize(row.activity),
    sortable: true,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => {
      const meta = STATUS_META[row.status];
      return <Badge variant={meta.variant}>{meta.label}</Badge>;
    },
    sortable: true,
    sortValue: (row) => STATUS_META[row.status].label,
  },
];

export interface SessionHistoryTableProps {
  className?: string;
}

export function SessionHistoryTable({ className }: SessionHistoryTableProps) {
  const sessionsQuery = useSessionHistoryQuery();
  const statsQuery = useSessionStatsQuery();

  const stats = statsQuery.data;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Average duration"
          value={stats ? `${stats.average} min` : "—"}
          icon={Clock}
        />
        <MetricCard
          label="Longest session"
          value={stats ? `${stats.longest} min` : "—"}
          icon={TrendingUp}
        />
        <MetricCard
          label="Shortest session"
          value={stats ? `${stats.shortest} min` : "—"}
          icon={TrendingDown}
        />
      </div>

      <DataTable
        data={sessionsQuery.data ?? []}
        columns={columns}
        getRowId={(row) => row.id}
        loading={sessionsQuery.isLoading}
        pageSize={10}
        emptyTitle="No sessions yet"
        emptyDescription="Completed tracking sessions will show up here."
      />
    </div>
  );
}

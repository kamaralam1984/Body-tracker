"use client";

/**
 * Security-sensitive audit log table for the Audit tab — a scannable,
 * sortable table (GitHub "Security log" style) built on the existing
 * generic `DataTable<T>` (`src/components/ui/data-table.tsx`), rather than
 * a bespoke table implementation.
 *
 * Filtering (org scope, date range, search, category via `filters.status`)
 * happens upstream via `filterActivityEvents` — this component only renders
 * whatever `events` it's given.
 */

import { Avatar } from "@/components/ui/avatar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { formatAbsoluteDate } from "../lib/admin-format";
import { useOrganizationsQuery } from "../hooks/use-admin-queries";
import { ACTIVITY_EVENT_ICON } from "./activity-event-icon";
import type { ActivityEvent } from "../types";

export interface AuditLogTableProps {
  events: ActivityEvent[];
  className?: string;
}

export function AuditLogTable({ events, className }: AuditLogTableProps) {
  const { data: organizations } = useOrganizationsQuery();
  const orgNameById = new Map((organizations ?? []).map((org) => [org.id, org.name]));

  const columns: DataTableColumn<ActivityEvent>[] = [
    {
      key: "event",
      header: "Event",
      sortable: true,
      sortValue: (e) => e.description,
      render: (e) => {
        const Icon = ACTIVITY_EVENT_ICON[e.type];
        return (
          <span className="text-foreground flex items-center gap-2 text-sm">
            <Icon className="text-muted-foreground size-4 shrink-0" strokeWidth={1.75} />
            {e.description}
          </span>
        );
      },
    },
    {
      key: "actor",
      header: "Actor",
      sortable: true,
      sortValue: (e) => e.actor.name,
      render: (e) => (
        <span className="flex items-center gap-2">
          <Avatar src={e.actor.avatarSrc} fallback={e.actor.name} size="sm" />
          <span className="text-foreground text-sm">{e.actor.name}</span>
        </span>
      ),
    },
    {
      key: "organization",
      header: "Organization",
      sortable: true,
      sortValue: (e) => orgNameById.get(e.organizationId) ?? e.organizationId,
      render: (e) => (
        <span className="text-muted-foreground text-sm">
          {orgNameById.get(e.organizationId) ?? e.organizationId}
        </span>
      ),
    },
    {
      key: "target",
      header: "Target",
      sortable: true,
      sortValue: (e) => e.target,
      render: (e) => <span className="text-muted-foreground text-sm">{e.target}</span>,
    },
    {
      key: "ip",
      header: "IP address",
      sortable: true,
      sortValue: (e) => e.ipAddress,
      render: (e) => <span className="text-muted-foreground font-mono text-xs">{e.ipAddress}</span>,
    },
    {
      key: "time",
      header: "Time",
      sortable: true,
      sortValue: (e) => new Date(e.timestamp).getTime(),
      render: (e) => (
        <span className="text-muted-foreground text-sm">{formatAbsoluteDate(e.timestamp)}</span>
      ),
    },
  ];

  return (
    <DataTable
      data={events}
      columns={columns}
      getRowId={(e) => e.id}
      pageSize={15}
      emptyTitle="No events match your filters"
      emptyDescription="Try widening the date range, clearing the search, or switching organizations."
      className={cn(className)}
    />
  );
}

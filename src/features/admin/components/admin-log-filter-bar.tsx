"use client";

/**
 * Controlled search/filter bar that drives BOTH the Activity and Audit tabs
 * on the Activity Log & Audit Log page. This is the ONLY filter bar for that
 * page — it reads/writes `activityFilters`/`setActivityFilters` straight
 * from `useAdminStore`, following the same shape as
 * `src/features/session-management/components/session-filter-bar.tsx`'s
 * date-preset chip pattern.
 *
 * IMPORTANT — tab wiring: the category split between "Activity" (all events)
 * and "Audit" (the security-sensitive subset) is driven by
 * `filters.status`, which `filterActivityEvents` (in `../lib/admin-query.ts`)
 * already treats as the category selector (`"activity" | "audit" | "all"`).
 * This filter bar does NOT own the tab state — the page assembling this
 * component is expected to render `Tabs` with values `"activity"`/`"audit"`
 * and, in its `onValueChange`, call:
 *
 *   setActivityFilters({ ...activityFilters, status: tabValue })
 *
 * so switching tabs re-filters the same underlying event list by category
 * without this component needing to know about tabs at all.
 */

import { SearchInput } from "@/components/ui/input-extras";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportToCsv, type ExportRow } from "@/features/reporting";
import { useAdminStore } from "../store/admin-store";
import { useOrganizationsQuery } from "../hooks/use-admin-queries";
import { formatAbsoluteDate } from "../lib/admin-format";
import type { ActivityEvent, AdminDatePreset } from "../types";

const datePresets: { value: AdminDatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export interface AdminLogFilterBarProps {
  /** Currently visible events (post-filter), used to build the CSV export rows. */
  events: ActivityEvent[];
  className?: string;
}

export function AdminLogFilterBar({ events, className }: AdminLogFilterBarProps) {
  const activityFilters = useAdminStore((s) => s.activityFilters);
  const setActivityFilters = useAdminStore((s) => s.setActivityFilters);
  const { data: organizations } = useOrganizationsQuery();

  const organizationOptions = [
    { value: "all", label: "All organizations" },
    ...(organizations ?? []).map((org) => ({ value: org.id, label: org.name })),
  ];

  function patch(next: Partial<typeof activityFilters>) {
    setActivityFilters({ ...activityFilters, ...next });
  }

  function handleExport() {
    const rows: ExportRow[] = events.map((event) => ({
      Event: event.description,
      Actor: event.actor.name,
      Organization:
        organizations?.find((o) => o.id === event.organizationId)?.name ?? event.organizationId,
      Target: event.target,
      IP: event.ipAddress,
      Time: formatAbsoluteDate(event.timestamp),
    }));
    exportToCsv("audit-log", rows);
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search by actor, description, target, or IP…"
          value={activityFilters.search}
          onChange={(event) => patch({ search: event.target.value })}
          onClear={() => patch({ search: "" })}
          className="w-full sm:max-w-sm"
        />

        <div className="flex flex-1 flex-wrap gap-2 sm:justify-end">
          <Select
            options={organizationOptions}
            value={activityFilters.organizationId}
            onValueChange={(value) => patch({ organizationId: value })}
            placeholder="Organization"
            className="w-full sm:w-48"
          />
          <Button type="button" variant="outline" size="md" onClick={handleExport}>
            <Download />
            Export
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          When
        </span>
        {datePresets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => patch({ datePreset: preset.value })}
          >
            <Badge
              variant={activityFilters.datePreset === preset.value ? "accent" : "outline"}
              className="hover:bg-muted cursor-pointer transition-colors"
            >
              {preset.label}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

/**
 * Controlled, fully-wired filter bar for the activity-intelligence module —
 * unlike reporting's static placeholder filter panel, this one reads and
 * writes `useActivityStore` directly (`filters`/`setFilters`), so the call
 * site is simply `<ActivityFilterBar />` with no props. Mirrors
 * `@/features/session-management/components/session-filter-bar.tsx`'s exact
 * visual pattern (SearchInput + Selects + date-preset chips).
 */

import { SearchInput } from "@/components/ui/input-extras";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useActivityStore } from "../store/activity-store";
import { activityLabel } from "../lib/activity-format";
import type { ActivityDatePreset, ActivityDetectionState, ActivityKind } from "../types";

const ACTIVITY_KINDS: ActivityKind[] = [
  "walking",
  "standing",
  "sitting",
  "running",
  "jumping",
  "raise-hand",
  "wave",
  "smile",
  "blink",
  "head-movement",
  "hand-movement",
  "body-movement",
  "idle",
  "unknown",
];

const STATUS_LABEL: Record<ActivityDetectionState, string> = {
  active: "Active",
  inactive: "Inactive",
  detected: "Detected",
  searching: "Searching",
  completed: "Completed",
  paused: "Paused",
  unavailable: "Unavailable",
};

const STATUS_VALUES: ActivityDetectionState[] = [
  "active",
  "inactive",
  "detected",
  "searching",
  "completed",
  "paused",
  "unavailable",
];

const kindOptions = [
  { value: "all", label: "All activities" },
  ...ACTIVITY_KINDS.map((kind) => ({ value: kind, label: activityLabel(kind) })),
];

const statusOptions = [
  { value: "all", label: "All statuses" },
  ...STATUS_VALUES.map((status) => ({ value: status, label: STATUS_LABEL[status] })),
];

const datePresets: { value: ActivityDatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

export function ActivityFilterBar({ className }: { className?: string }) {
  const filters = useActivityStore((state) => state.filters);
  const setFilters = useActivityStore((state) => state.setFilters);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search by activity, session, or ID…"
          value={filters.search}
          onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          onClear={() => setFilters({ ...filters, search: "" })}
          className="w-full sm:max-w-sm"
        />

        <div className="flex flex-1 flex-wrap gap-2 sm:justify-end">
          <Select
            options={kindOptions}
            value={filters.kind}
            onValueChange={(value) =>
              setFilters({ ...filters, kind: value as ActivityKind | "all" })
            }
            placeholder="Activity type"
            className="w-full sm:w-44"
          />
          <Select
            options={statusOptions}
            value={filters.status}
            onValueChange={(value) =>
              setFilters({ ...filters, status: value as ActivityDetectionState | "all" })
            }
            placeholder="Status"
            className="w-full sm:w-40"
          />
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
            onClick={() => setFilters({ ...filters, datePreset: preset.value })}
          >
            <Badge
              variant={filters.datePreset === preset.value ? "accent" : "outline"}
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

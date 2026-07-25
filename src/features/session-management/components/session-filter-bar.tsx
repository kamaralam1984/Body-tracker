"use client";

/**
 * Controlled search/filter/sort bar for the session library.
 *
 * Unlike `@/features/reporting/components/report-filter-panel.tsx` (whose
 * controls are local `useState` and not wired to anything — reporting's
 * filtering is out of scope for that phase), this bar owns no filter state
 * itself: `filters`/`sortField` are passed in and every change is reported
 * up via `onFiltersChange`/`onSortFieldChange`. The session library's whole
 * value proposition is finding a specific session fast, so filtering has to
 * actually work — the parent page runs `filterSessions`/`sortSessions`
 * (from `../lib/session-query`) against the live query result using the
 * `filters`/`sortField` this component reports.
 *
 * The substring search itself (name / user / id / tags) is implemented in
 * `filterSessions` in `../lib/session-query.ts`, not in this component —
 * this component only forwards the raw query string.
 */

import { SearchInput } from "@/components/ui/input-extras";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SessionFilters, SessionSortField } from "../types";

const datePresets: { value: SessionFilters["datePreset"]; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "live", label: "Live" },
  { value: "recording", label: "Recording" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
  { value: "processing", label: "Processing" },
  { value: "uploading", label: "Uploading" },
  { value: "failed", label: "Failed" },
  { value: "deleted", label: "Deleted" },
];

const qualityOptions = [
  { value: "all", label: "All quality" },
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "limited", label: "Limited" },
  { value: "searching", label: "Searching" },
  { value: "offline", label: "Offline" },
];

const activityOptions = [
  { value: "all", label: "All activity" },
  { value: "standing", label: "Standing" },
  { value: "walking", label: "Walking" },
  { value: "running", label: "Running" },
  { value: "sitting", label: "Sitting" },
  { value: "idle", label: "Idle" },
];

const sortOptions: { value: SessionSortField; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "duration", label: "Duration" },
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
  { value: "quality", label: "Quality" },
  { value: "user", label: "User" },
];

export interface SessionFilterBarProps {
  filters: SessionFilters;
  onFiltersChange: (filters: SessionFilters) => void;
  sortField: SessionSortField;
  onSortFieldChange: (field: SessionSortField) => void;
  className?: string;
}

export function SessionFilterBar({
  filters,
  onFiltersChange,
  sortField,
  onSortFieldChange,
  className,
}: SessionFilterBarProps) {
  function patch(next: Partial<SessionFilters>) {
    onFiltersChange({ ...filters, ...next });
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search by name, user, ID, or tag…"
          value={filters.search}
          onChange={(event) => patch({ search: event.target.value })}
          onClear={() => patch({ search: "" })}
          className="w-full sm:max-w-sm"
        />

        <div className="flex flex-1 flex-wrap gap-2 sm:justify-end">
          <Select
            options={statusOptions}
            value={filters.status}
            onValueChange={(value) => patch({ status: value as SessionFilters["status"] })}
            placeholder="Status"
            className="w-full sm:w-40"
          />
          <Select
            options={qualityOptions}
            value={filters.quality}
            onValueChange={(value) => patch({ quality: value as SessionFilters["quality"] })}
            placeholder="Quality"
            className="w-full sm:w-40"
          />
          <Select
            options={activityOptions}
            value={filters.activity}
            onValueChange={(value) => patch({ activity: value as SessionFilters["activity"] })}
            placeholder="Activity"
            className="w-full sm:w-40"
          />
          <Select
            options={sortOptions}
            value={sortField}
            onValueChange={(value) => onSortFieldChange(value as SessionSortField)}
            placeholder="Sort by"
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
            onClick={() => patch({ datePreset: preset.value })}
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

"use client";

/**
 * Advanced filter panel for the reporting module. Follows the exact
 * convention established by `@/features/session-analytics`'s
 * `AnalyticsFiltersBar` — every control is local `useState`, nothing is
 * wired to a real query yet (out of scope for this phase) — but presented as
 * a fuller standalone panel (date-range presets, a dedicated "Save filter"
 * action) rather than an inline toolbar row.
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input-extras";
import { Select } from "@/components/ui/select";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";

const quickFilters = [
  { value: "today", label: "Today" },
  { value: "7d", label: "This week" },
  { value: "30d", label: "This month" },
  { value: "all", label: "All time" },
];

const datePresetOptions = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "interrupted", label: "Interrupted" },
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

export interface ReportFilterPanelProps {
  className?: string;
}

export function ReportFilterPanel({ className }: ReportFilterPanelProps) {
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState("7d");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [status, setStatus] = useState("all");
  const [quality, setQuality] = useState("all");
  const [activity, setActivity] = useState("all");

  return (
    <Card className={cn("flex flex-col gap-5 p-6", className)}>
      <div className="flex flex-col gap-1">
        <p className="text-foreground text-base font-semibold tracking-tight">Filters</p>
        <p className="text-muted-foreground text-sm">
          Narrow down the session history and reports shown below.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Quick filter
        </span>
        {quickFilters.map((preset) => (
          <button key={preset.value} type="button" onClick={() => setDatePreset(preset.value)}>
            <Badge
              variant={datePreset === preset.value ? "accent" : "outline"}
              className="hover:bg-muted cursor-pointer transition-colors"
            >
              {preset.label}
            </Badge>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <SearchInput
          placeholder="Search by session ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          className="w-full"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            options={datePresetOptions}
            value={datePreset}
            onValueChange={setDatePreset}
            placeholder="Date range"
          />
          <Select
            options={statusOptions}
            value={status}
            onValueChange={setStatus}
            placeholder="Status"
          />
          <Select
            options={qualityOptions}
            value={quality}
            onValueChange={setQuality}
            placeholder="Tracking quality"
          />
          <Select
            options={activityOptions}
            value={activity}
            onValueChange={setActivity}
            placeholder="Activity"
          />
        </div>

        {datePreset === "custom" && (
          <DateRangePicker
            value={customRange}
            onChange={setCustomRange}
            placeholder="Pick a custom date range"
            className="w-full sm:w-72"
          />
        )}
      </div>

      <div className="border-border-subtle flex flex-col gap-2 border-t pt-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled title="Coming soon">
            Save this filter
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">Coming soon</p>
      </div>
    </Card>
  );
}

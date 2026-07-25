"use client";

/**
 * Horizontal filter row for the analytics dashboard. Mirrors the
 * "toolbar with local state, no real filtering logic" convention established
 * by `src/app/(app)/reports/reports-toolbar.tsx` — every control here only
 * updates local component state. Wiring these to real data is out of scope
 * for this phase.
 */

import { useState } from "react";
import { SearchInput } from "@/components/ui/input-extras";
import { Select } from "@/components/ui/select";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "idle", label: "Idle" },
];

const qualityOptions = [
  { value: "all", label: "All" },
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "limited", label: "Limited" },
  { value: "searching", label: "Searching" },
  { value: "offline", label: "Offline" },
];

const cameraOptions = [
  { value: "all", label: "All cameras" },
  { value: "default", label: "Default camera" },
];

export interface AnalyticsFiltersBarProps {
  className?: string;
}

export function AnalyticsFiltersBar({ className }: AnalyticsFiltersBarProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [quality, setQuality] = useState("all");
  const [camera, setCamera] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <SearchInput
        placeholder="Search sessions…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch("")}
        className="w-full sm:w-56"
      />
      <Select
        options={statusOptions}
        value={status}
        onValueChange={setStatus}
        placeholder="Status"
        className="w-full sm:w-40"
      />
      <Select
        options={qualityOptions}
        value={quality}
        onValueChange={setQuality}
        placeholder="Tracking quality"
        className="w-full sm:w-44"
      />
      <Select
        options={cameraOptions}
        value={camera}
        onValueChange={setCamera}
        placeholder="Camera"
        className="w-full sm:w-44"
      />
      <DateRangePicker value={dateRange} onChange={setDateRange} className="w-full sm:w-64" />
    </div>
  );
}

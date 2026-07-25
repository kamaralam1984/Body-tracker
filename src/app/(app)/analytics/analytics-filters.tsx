"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";

const rangeOptions = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const segmentOptions = [
  { value: "all", label: "All members" },
  { value: "strength", label: "Strength" },
  { value: "mobility", label: "Mobility" },
  { value: "cardio", label: "Cardio" },
];

export function AnalyticsFilters() {
  const [range, setRange] = useState("30d");
  const [segment, setSegment] = useState("all");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select options={rangeOptions} value={range} onValueChange={setRange} className="sm:w-48" />
      <Select
        options={segmentOptions}
        value={segment}
        onValueChange={setSegment}
        className="sm:w-48"
      />
    </div>
  );
}

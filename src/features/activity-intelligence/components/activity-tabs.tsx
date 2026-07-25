"use client";

/**
 * Small `Tabs` wrapper offering a fast Today/Yesterday/This week/This month
 * quick-switch above the history section, as an alternative to opening the
 * full `ActivityFilterBar`. Fully controlled — value/change live in the
 * parent (typically synced with the store's `filters.datePreset`).
 *
 * <ActivityHistoryTabs value={preset} onValueChange={setPreset} />
 */

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ActivityHistoryTabValue = "today" | "yesterday" | "7d" | "30d";

const TAB_OPTIONS: { value: ActivityHistoryTabValue; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "This week" },
  { value: "30d", label: "This month" },
];

export function ActivityHistoryTabs({
  value,
  onValueChange,
  className,
}: {
  value: ActivityHistoryTabValue;
  onValueChange: (value: ActivityHistoryTabValue) => void;
  className?: string;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(next as ActivityHistoryTabValue)}
      className={className}
    >
      <TabsList>
        {TAB_OPTIONS.map((option) => (
          <TabsTrigger key={option.value} value={option.value}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

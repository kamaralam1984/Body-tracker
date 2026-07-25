"use client";

/**
 * Day-by-hour activity heatmap. `useActivityHeatmapQuery` returns a flat
 * `HeatmapPoint[]` ({ day, hour, value }) covering all 24 hours for each of
 * the 7 days, so we pass the full hour domain as `xLabels` (rather than a
 * sparse subset) to avoid dropping any data points that `ChartHeatmap`
 * might filter against the label domain.
 */

import { ChartHeatmap } from "@/components/ui/charts/chart-heatmap";
import { AnalyticsCard } from "@/components/ui/card-variants";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityHeatmapQuery } from "../hooks/use-reporting-queries";

const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => String(hour));
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ActivityHeatmapSection({ className }: { className?: string }) {
  const { data, isLoading, isError } = useActivityHeatmapQuery();

  return (
    <AnalyticsCard
      title="Activity heatmap"
      description="When you're most active, by hour and day"
      className={className}
    >
      {isLoading && (
        <div className="grid grid-cols-1 gap-1">
          {DAY_LABELS.map((day) => (
            <Skeleton key={day} className="h-8 w-full rounded" />
          ))}
        </div>
      )}
      {!isLoading && (isError || !data) && (
        <p className="text-danger-600 dark:text-danger-500 text-sm font-medium">
          Couldn&apos;t load the activity heatmap. Please try again.
        </p>
      )}
      {!isLoading && data && (
        <ChartHeatmap
          data={data.map((point) => ({ day: point.day, hour: point.hour, value: point.value }))}
          xLabels={HOUR_LABELS}
          yLabels={DAY_LABELS}
          xKey="hour"
          yKey="day"
          valueKey="value"
        />
      )}
    </AnalyticsCard>
  );
}

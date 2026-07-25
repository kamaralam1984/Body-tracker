"use client";

/**
 * Session duration vs. tracking quality correlation — the one place this
 * module uses `ChartScatter`. Quality is mapped to a small 0-4 ordinal score
 * purely so it can sit on a numeric axis; this is an aggregate historical
 * chart (same as the quality trend line elsewhere), not a live confidence
 * readout, so a numeric axis is consistent with the rest of the module.
 */

import { useRef } from "react";
import { AnalyticsCard } from "@/components/ui/card-variants";
import { ChartDownloadButton } from "@/components/ui/charts/chart-download-button";
import { ChartScatter } from "@/components/ui/charts/chart-scatter";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionHistoryQuery } from "../hooks/use-reporting-queries";
import type { QualityLevel } from "@/features/session-analytics";
import { cn } from "@/lib/utils";

const QUALITY_SCORE: Record<QualityLevel, number> = {
  offline: 0,
  searching: 1,
  limited: 2,
  good: 3,
  excellent: 4,
};

export function SessionQualityScatter({ className }: { className?: string }) {
  const { data, isLoading, isError } = useSessionHistoryQuery();
  const chartRef = useRef<HTMLDivElement>(null);

  return (
    <AnalyticsCard
      title="Duration vs. quality"
      description="Whether longer sessions track better or worse"
      action={<ChartDownloadButton targetRef={chartRef} filename="duration-vs-quality" />}
      className={cn(className)}
    >
      {isLoading ? (
        <Skeleton className="h-[260px] w-full rounded-lg" />
      ) : isError || !data ? (
        <div className="flex h-[260px] w-full items-center justify-center">
          <p className="text-muted-foreground text-sm">Couldn&apos;t load this chart</p>
        </div>
      ) : (
        <div ref={chartRef}>
          <ChartScatter
            data={data.map((row) => ({
              duration: row.durationMinutes,
              quality: QUALITY_SCORE[row.quality],
              session: row.id,
            }))}
            xKey="duration"
            yKey="quality"
            nameKey="session"
          />
        </div>
      )}
    </AnalyticsCard>
  );
}

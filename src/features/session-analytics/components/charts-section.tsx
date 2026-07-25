"use client";

/**
 * Three-up analytics grid for the session dashboard, built entirely from the
 * existing Phase 2 chart primitives (`ChartLine`/`ChartDonut`/`ChartBar`) and
 * the `AnalyticsCard` wrapper — no new chart primitives, no direct Recharts
 * usage. Each card independently handles its own React Query loading/error
 * state so a slow or failed query never blanks the whole section.
 */

import { useRef } from "react";
import { motion } from "framer-motion";
import { AnalyticsCard } from "@/components/ui/card-variants";
import { ChartBar } from "@/components/ui/charts/chart-bar";
import { ChartDonut } from "@/components/ui/charts/chart-donut";
import { ChartDownloadButton } from "@/components/ui/charts/chart-download-button";
import { ChartLine } from "@/components/ui/charts/chart-line";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useMovementDistributionQuery,
  useQualityTrendQuery,
  useSessionDurationTrendQuery,
} from "../hooks/use-analytics-queries";
import type { ActivityType } from "../types";

const ACTIVITY_LABEL: Record<ActivityType, string> = {
  standing: "Standing",
  walking: "Walking",
  running: "Running",
  sitting: "Sitting",
  idle: "Idle",
};

function ChartErrorMessage() {
  return (
    <div className="flex h-[260px] w-full items-center justify-center">
      <p className="text-muted-foreground text-sm">Couldn&apos;t load this chart</p>
    </div>
  );
}

interface ChartsSectionProps {
  className?: string;
}

export function ChartsSection({ className }: ChartsSectionProps) {
  const qualityTrendQuery = useQualityTrendQuery();
  const movementDistributionQuery = useMovementDistributionQuery();
  const sessionDurationQuery = useSessionDurationTrendQuery();
  const qualityChartRef = useRef<HTMLDivElement>(null);

  const movementData = movementDistributionQuery.data?.map((point) => ({
    name: ACTIVITY_LABEL[point.activity],
    value: point.minutes,
  }));
  const totalMinutes = movementDistributionQuery.data?.reduce(
    (sum, point) => sum + point.minutes,
    0,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn("grid grid-cols-1 gap-4 xl:grid-cols-3", className)}
    >
      <AnalyticsCard
        title="Tracking quality trend"
        description="Last 7 days"
        action={
          <ChartDownloadButton targetRef={qualityChartRef} filename="tracking-quality-trend" />
        }
      >
        {qualityTrendQuery.isLoading ? (
          <Skeleton className="h-[260px] w-full rounded-lg" />
        ) : qualityTrendQuery.isError ? (
          <ChartErrorMessage />
        ) : (
          <div ref={qualityChartRef}>
            <ChartLine
              data={(qualityTrendQuery.data ?? []).map((point) => ({
                label: point.label,
                quality: point.quality,
              }))}
              xKey="label"
              dataKeys={["quality"]}
            />
          </div>
        )}
      </AnalyticsCard>

      <AnalyticsCard title="Movement distribution" description="Minutes by activity">
        {movementDistributionQuery.isLoading ? (
          <Skeleton className="mx-auto size-40 rounded-full" />
        ) : movementDistributionQuery.isError ? (
          <ChartErrorMessage />
        ) : (
          <ChartDonut
            data={movementData ?? []}
            centerLabel={
              <span className="text-foreground text-lg font-semibold">{totalMinutes ?? 0} min</span>
            }
          />
        )}
      </AnalyticsCard>

      <AnalyticsCard title="Session duration trend" description="Last 7 days">
        {sessionDurationQuery.isLoading ? (
          <Skeleton className="h-[260px] w-full rounded-lg" />
        ) : sessionDurationQuery.isError ? (
          <ChartErrorMessage />
        ) : (
          <ChartBar
            data={(sessionDurationQuery.data ?? []).map((point) => ({
              label: point.label,
              minutes: point.minutes,
            }))}
            xKey="label"
            dataKeys={["minutes"]}
          />
        )}
      </AnalyticsCard>
    </motion.div>
  );
}

"use client";

/**
 * KPI row + trend chart for a single reporting period. Owns its own data
 * fetching via `usePeriodAnalyticsQuery(period)` — the parent page only
 * decides WHICH period is shown (daily/weekly/monthly), it doesn't pass data.
 *
 * Chart choice: daily/weekly trends read as a continuous flow through the
 * day/week, so `ChartArea` suits them best. Monthly's trend buckets are
 * "Week 1..4" — discrete, non-continuous categories — so a `ChartBar` is the
 * more honest read for that one (bars for discrete buckets, area for a
 * continuous timeline).
 */

import { CalendarCheck2, Clock, Sparkles } from "lucide-react";
import { ChartArea } from "@/components/ui/charts/chart-area";
import { ChartBar } from "@/components/ui/charts/chart-bar";
import { AnalyticsCard, MetricCard } from "@/components/ui/card-variants";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePeriodAnalyticsQuery } from "../hooks/use-reporting-queries";
import type { SummaryPeriod } from "../types";

const PERIOD_CHART_TITLE: Record<SummaryPeriod, string> = {
  daily: "Today's activity",
  weekly: "This week's activity",
  monthly: "This month's activity",
};

const QUALITY_LABEL: Record<string, string> = {
  excellent: "Excellent",
  good: "Good",
  limited: "Limited",
  searching: "Searching",
  offline: "Offline",
};

export function PeriodAnalyticsSection({
  period,
  className,
}: {
  period: SummaryPeriod;
  className?: string;
}) {
  const { data, isLoading, isError } = usePeriodAnalyticsQuery(period);

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-[76px] w-full rounded-xl" />
          <Skeleton className="h-[76px] w-full rounded-xl" />
          <Skeleton className="h-[76px] w-full rounded-xl" />
        </div>
        <Skeleton className="h-[336px] w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={cn("border-danger bg-danger-bg rounded-xl border p-6", className)}>
        <p className="text-danger-600 dark:text-danger-500 text-sm font-medium">
          Couldn&apos;t load {period} analytics. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Total sessions"
          value={String(data.totalSessions)}
          icon={CalendarCheck2}
        />
        <MetricCard label="Total minutes" value={String(data.totalMinutes)} icon={Clock} />
        <MetricCard
          label="Average quality"
          value={QUALITY_LABEL[data.averageQuality] ?? data.averageQuality}
          icon={Sparkles}
        />
      </div>
      <AnalyticsCard title={PERIOD_CHART_TITLE[period]}>
        {period === "monthly" ? (
          <ChartBar data={data.trend} xKey="label" dataKeys={["minutes"]} />
        ) : (
          <ChartArea data={data.trend} xKey="label" dataKeys={["minutes"]} />
        )}
      </AnalyticsCard>
    </div>
  );
}

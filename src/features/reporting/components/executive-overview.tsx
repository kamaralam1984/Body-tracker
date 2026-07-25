"use client";

/**
 * Composition root for the Executive tab: fetches the queries
 * `ExecutiveSummary`/`InsightsPanel`/`ComparisonPanel` need, assembles
 * `ExecutiveSummaryData`, and generates insights via the rule-based engine.
 * The presentational components stay data-fetching-free; this is the one
 * place that wires them to live query state. A period switcher lets the
 * comparison flip between Today vs Yesterday / Week vs Previous Week /
 * Month vs Previous Month — the mock service already models "current period
 * vs previous period" per `SummaryPeriod`, so this just re-points the query.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-extras";
import { Skeleton } from "@/components/ui/skeleton";
import type { SummaryPeriod } from "@/features/session-analytics";
import {
  useDetectionComparisonQuery,
  useDetectionRatesQuery,
  useMovementFrequencyQuery,
  usePeriodAnalyticsQuery,
} from "../hooks/use-reporting-queries";
import { computePerformanceScore } from "../lib/comparison";
import {
  combineInsights,
  generateBestSlotInsight,
  generateComparisonInsights,
  generateDetectionInsight,
  generateMovementInsight,
} from "../lib/insight-engine";
import { ComparisonPanel } from "./comparison-panel";
import { ExecutiveSummary } from "./executive-summary";
import { InsightsPanel } from "./insights-panel";
import { cn } from "@/lib/utils";

const PERIOD_META: Record<
  SummaryPeriod,
  { label: string; comparisonTitle: string; slot: "hour" | "day" }
> = {
  daily: { label: "Today", comparisonTitle: "Today vs yesterday", slot: "hour" },
  weekly: { label: "This week", comparisonTitle: "This week vs last week", slot: "day" },
  monthly: { label: "This month", comparisonTitle: "This month vs last month", slot: "day" },
};

export function ExecutiveOverview({ className }: { className?: string }) {
  const [period, setPeriod] = useState<SummaryPeriod>("weekly");
  const periodAnalytics = usePeriodAnalyticsQuery(period);
  const detectionComparison = useDetectionComparisonQuery();
  const detectionRates = useDetectionRatesQuery();
  const movementFrequency = useMovementFrequencyQuery();

  const isLoading =
    periodAnalytics.isLoading ||
    detectionComparison.isLoading ||
    detectionRates.isLoading ||
    movementFrequency.isLoading;
  const isError = periodAnalytics.isError || detectionComparison.isError;

  const periodSwitcher = (
    <ButtonGroup className="self-start">
      {(Object.keys(PERIOD_META) as SummaryPeriod[]).map((p) => (
        <Button
          key={p}
          type="button"
          variant={period === p ? "primary" : "outline"}
          size="sm"
          onClick={() => setPeriod(p)}
        >
          {PERIOD_META[p].label}
        </Button>
      ))}
    </ButtonGroup>
  );

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        {periodSwitcher}
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !periodAnalytics.data || !detectionComparison.data) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        {periodSwitcher}
        <div className="border-border bg-surface text-muted-foreground rounded-xl border p-6 text-sm">
          Couldn&apos;t load the executive summary right now.
        </div>
      </div>
    );
  }

  const kpis = [...periodAnalytics.data.comparison, ...detectionComparison.data];
  const performanceScore = computePerformanceScore(kpis);

  const insights = combineInsights(
    generateComparisonInsights(kpis),
    detectionRates.data ? generateDetectionInsight(detectionRates.data) : null,
    movementFrequency.data ? generateMovementInsight(movementFrequency.data) : null,
    generateBestSlotInsight(periodAnalytics.data.trend, PERIOD_META[period].slot),
  );

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {periodSwitcher}
      <ExecutiveSummary data={{ performanceScore, kpis, insights }} />
      <InsightsPanel insights={insights} />
      <ComparisonPanel title={PERIOD_META[period].comparisonTitle} comparisons={kpis} />
    </div>
  );
}

"use client";

import Link from "next/link";
import { Video } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-extras";
import { Card } from "@/components/ui/card";
import {
  ActivityChartsSkeleton,
  ActivityConfidenceBadge,
  ActivityDistributionChart,
  ActivityFilterBar,
  ActivityGrid,
  ActivityGridSkeleton,
  ActivityHeatmapChart,
  ActivityHistoryList,
  ActivityHistorySkeleton,
  ActivityHistoryTable,
  ActivityHistoryTabs,
  ActivityIcon,
  ActivityInsightsPanel,
  ActivityInsightsSkeleton,
  ActivityStatisticsGrid,
  ActivityStatisticsSkeleton,
  ActivityStatusBadge,
  ActivityTimelineFeed,
  ActivityTimelineSkeleton,
  DailyActivityChart,
  MovementTrendChart,
  NoActivityEmptyState,
  NoHistoryEmptyState,
  NoTimelineEmptyState,
  TrendIndicator,
  activityLabel,
  formatDurationLabel,
  formatRelativeTime,
  formatTimeOnly,
  useActivityIntelligenceQuery,
  useActivityStore,
  useActivityTimelineQuery,
  useLiveActivitiesQuery,
} from "@/features/activity-intelligence";
import type { ActivityHistoryTabValue } from "@/features/activity-intelligence";

function CurrentStatusHero() {
  const { data: liveActivities, isLoading } = useLiveActivitiesQuery();

  if (isLoading) {
    return <Card className="h-32 animate-pulse p-6" />;
  }

  const current = liveActivities?.find((a) => a.status === "active");

  if (!current) {
    return (
      <Card className="flex items-center justify-between gap-4 p-6">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-sm font-medium">Current status</p>
          <p className="text-foreground text-lg font-semibold">No activity currently detected</p>
        </div>
        <Button variant="primary" asChild>
          <Link href="/camera">
            <Video />
            Start live session
          </Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="bg-accent-bg flex size-14 shrink-0 items-center justify-center rounded-2xl">
          <ActivityIcon
            kind={current.kind}
            className="text-accent-600 dark:text-accent-500 size-6"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-muted-foreground text-sm font-medium">Current status</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-foreground text-xl font-semibold tracking-tight">
              {activityLabel(current.kind)}
            </p>
            <ActivityStatusBadge status={current.status} />
            <ActivityConfidenceBadge confidence={current.confidence} />
          </div>
          <p className="text-muted-foreground text-xs">
            Started {current.startedAt ? formatTimeOnly(current.startedAt) : "—"} · Running for{" "}
            {formatDurationLabel(current.durationSeconds)} · Updated{" "}
            {formatRelativeTime(current.lastUpdated)}
          </p>
        </div>
      </div>
      <TrendIndicator trend={current.trend} label={current.trendLabel} />
    </Card>
  );
}

export default function ActivityPage() {
  const { data: liveActivities, isLoading: isLiveLoading } = useLiveActivitiesQuery();
  const { data: timeline, isLoading: isTimelineLoading } = useActivityTimelineQuery();
  const {
    history,
    statistics,
    distribution,
    movementTrend,
    dailyActivity,
    heatmap,
    insights,
    isLoading,
  } = useActivityIntelligenceQuery();

  const filters = useActivityStore((state) => state.filters);
  const setFilters = useActivityStore((state) => state.setFilters);
  const historyView = useActivityStore((state) => state.historyView);
  const setHistoryView = useActivityStore((state) => state.setHistoryView);

  const tabValue: ActivityHistoryTabValue =
    filters.datePreset === "all" ? "30d" : filters.datePreset;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Activity Intelligence"
        description="A live, business-language view of every tracked activity — from posture to gestures — with history and trends."
        actions={
          <Button variant="primary" size="md" asChild>
            <Link href="/camera">
              <Video />
              Start live session
            </Link>
          </Button>
        }
      />

      <CurrentStatusHero />

      {isLoading ? (
        <ActivityStatisticsSkeleton />
      ) : (
        statistics && <ActivityStatisticsGrid statistics={statistics} />
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">Live activity</h2>
        {isLiveLoading ? (
          <ActivityGridSkeleton />
        ) : !liveActivities || liveActivities.length === 0 ? (
          <NoActivityEmptyState
            action={
              <Button variant="primary" asChild>
                <Link href="/camera">Start live session</Link>
              </Button>
            }
          />
        ) : (
          <ActivityGrid activities={liveActivities} />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">Charts</h2>
        {isLoading || !distribution || !movementTrend || !dailyActivity || !heatmap ? (
          <ActivityChartsSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ActivityDistributionChart data={distribution} />
            <MovementTrendChart data={movementTrend} />
            <DailyActivityChart data={dailyActivity} />
            <ActivityHeatmapChart data={heatmap} />
          </div>
        )}
      </div>

      {isLoading ? (
        <ActivityInsightsSkeleton />
      ) : (
        insights && <ActivityInsightsPanel insights={insights} />
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">Activity timeline</h2>
        {isTimelineLoading ? (
          <ActivityTimelineSkeleton />
        ) : !timeline || timeline.length === 0 ? (
          <NoTimelineEmptyState />
        ) : (
          <Card className="p-6">
            <ActivityTimelineFeed events={timeline.slice(0, 12)} />
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-foreground text-lg font-semibold tracking-tight">Activity history</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ActivityHistoryTabs
              value={tabValue}
              onValueChange={(value) => setFilters({ ...filters, datePreset: value })}
            />
            <ButtonGroup>
              <Button
                variant={historyView === "list" ? "primary" : "outline"}
                size="sm"
                onClick={() => setHistoryView("list")}
              >
                List
              </Button>
              <Button
                variant={historyView === "table" ? "primary" : "outline"}
                size="sm"
                onClick={() => setHistoryView("table")}
              >
                Table
              </Button>
            </ButtonGroup>
          </div>
        </div>

        <ActivityFilterBar />

        {isLoading ? (
          <ActivityHistorySkeleton />
        ) : !history || history.length === 0 ? (
          <NoHistoryEmptyState />
        ) : historyView === "list" ? (
          <ActivityHistoryList entries={history} />
        ) : (
          <ActivityHistoryTable entries={history} />
        )}
      </div>
    </div>
  );
}

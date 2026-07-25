"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  computeActivityDistribution,
  computeActivityHeatmap,
  computeActivityStatistics,
  computeDailyActivity,
  computeMovementTrend,
  fetchActivityHistory,
  fetchActivityTimeline,
  fetchLiveActivities,
  generateActivityInsights,
} from "../lib/mock-activity-service";

export function useLiveActivitiesQuery() {
  return useQuery({ queryKey: ["activity-intelligence", "live"], queryFn: fetchLiveActivities });
}

export function useActivityTimelineQuery() {
  return useQuery({
    queryKey: ["activity-intelligence", "timeline"],
    queryFn: fetchActivityTimeline,
  });
}

export function useActivityHistoryQuery() {
  return useQuery({
    queryKey: ["activity-intelligence", "history"],
    queryFn: fetchActivityHistory,
  });
}

/** Derives every chart/stat/insight from the single history query result — one fetch, several read-models. */
export function useActivityIntelligenceQuery() {
  const historyQuery = useActivityHistoryQuery();
  const history = historyQuery.data;

  const derived = useMemo(() => {
    if (!history) return null;
    const statistics = computeActivityStatistics(history);
    return {
      statistics,
      distribution: computeActivityDistribution(history),
      movementTrend: computeMovementTrend(history),
      dailyActivity: computeDailyActivity(history),
      heatmap: computeActivityHeatmap(history),
      insights: generateActivityInsights(history, statistics),
    };
  }, [history]);

  return {
    history,
    isLoading: historyQuery.isLoading,
    isError: historyQuery.isError,
    ...derived,
  };
}

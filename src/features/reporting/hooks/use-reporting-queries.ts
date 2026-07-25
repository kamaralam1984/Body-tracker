"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchActivityHeatmap,
  fetchDetectionComparison,
  fetchDetectionRates,
  fetchDetectionTimeline,
  fetchMovementFrequency,
  fetchPeriodAnalytics,
  fetchSessionHistory,
  fetchSessionStats,
} from "../lib/mock-reporting-service";
import type { SummaryPeriod } from "../types";

export function usePeriodAnalyticsQuery(period: SummaryPeriod) {
  return useQuery({
    queryKey: ["reporting", "period-analytics", period],
    queryFn: () => fetchPeriodAnalytics(period),
  });
}

export function useDetectionRatesQuery() {
  return useQuery({ queryKey: ["reporting", "detection-rates"], queryFn: fetchDetectionRates });
}

export function useDetectionComparisonQuery() {
  return useQuery({
    queryKey: ["reporting", "detection-comparison"],
    queryFn: fetchDetectionComparison,
  });
}

export function useDetectionTimelineQuery() {
  return useQuery({
    queryKey: ["reporting", "detection-timeline"],
    queryFn: fetchDetectionTimeline,
  });
}

export function useMovementFrequencyQuery() {
  return useQuery({
    queryKey: ["reporting", "movement-frequency"],
    queryFn: fetchMovementFrequency,
  });
}

export function useActivityHeatmapQuery() {
  return useQuery({ queryKey: ["reporting", "activity-heatmap"], queryFn: fetchActivityHeatmap });
}

export function useSessionHistoryQuery() {
  return useQuery({ queryKey: ["reporting", "session-history"], queryFn: fetchSessionHistory });
}

export function useSessionStatsQuery() {
  return useQuery({ queryKey: ["reporting", "session-stats"], queryFn: fetchSessionStats });
}

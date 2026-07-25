"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchMovementDistribution,
  fetchPeriodSummary,
  fetchQualityTrend,
  fetchSessionDurationTrend,
} from "../lib/mock-analytics-service";
import type { SummaryPeriod } from "../types";

export function useQualityTrendQuery() {
  return useQuery({ queryKey: ["session-analytics", "quality-trend"], queryFn: fetchQualityTrend });
}

export function useMovementDistributionQuery() {
  return useQuery({
    queryKey: ["session-analytics", "movement-distribution"],
    queryFn: fetchMovementDistribution,
  });
}

export function useSessionDurationTrendQuery() {
  return useQuery({
    queryKey: ["session-analytics", "duration-trend"],
    queryFn: fetchSessionDurationTrend,
  });
}

export function usePeriodSummaryQuery(period: SummaryPeriod) {
  return useQuery({
    queryKey: ["session-analytics", "period-summary", period],
    queryFn: () => fetchPeriodSummary(period),
  });
}

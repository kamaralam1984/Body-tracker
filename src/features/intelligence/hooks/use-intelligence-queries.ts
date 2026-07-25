"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  fetchActivityQualityTrend,
  fetchAttentionSnapshot,
  fetchBehaviorTimeline,
  fetchDistractionEvents,
  fetchExerciseSets,
  fetchFatigueSnapshot,
  fetchFatigueTrend,
  fetchFocusTimeline,
  fetchForecasts,
  fetchGestureEvents,
  fetchGestureSummaries,
  fetchInsights,
  fetchMovementPattern,
  fetchPostureSnapshot,
  fetchPostureTrend,
  fetchRecommendations,
  fetchWellnessSnapshot,
  fetchWellnessTrend,
  fetchWorkoutTrend,
} from "../lib/mock-intelligence-service";
import { useIntelligenceStore } from "../store/intelligence-store";

export function useWellnessSnapshotQuery() {
  return useQuery({
    queryKey: ["intelligence", "wellness-snapshot"],
    queryFn: fetchWellnessSnapshot,
  });
}
export function useWellnessTrendQuery() {
  return useQuery({ queryKey: ["intelligence", "wellness-trend"], queryFn: fetchWellnessTrend });
}
export function useAttentionSnapshotQuery() {
  return useQuery({
    queryKey: ["intelligence", "attention-snapshot"],
    queryFn: fetchAttentionSnapshot,
  });
}
export function useFocusTimelineQuery() {
  return useQuery({ queryKey: ["intelligence", "focus-timeline"], queryFn: fetchFocusTimeline });
}
export function useDistractionEventsQuery() {
  return useQuery({
    queryKey: ["intelligence", "distraction-events"],
    queryFn: fetchDistractionEvents,
  });
}
export function usePostureSnapshotQuery() {
  return useQuery({
    queryKey: ["intelligence", "posture-snapshot"],
    queryFn: fetchPostureSnapshot,
  });
}
export function usePostureTrendQuery() {
  return useQuery({ queryKey: ["intelligence", "posture-trend"], queryFn: fetchPostureTrend });
}
export function useFatigueSnapshotQuery() {
  return useQuery({
    queryKey: ["intelligence", "fatigue-snapshot"],
    queryFn: fetchFatigueSnapshot,
  });
}
export function useFatigueTrendQuery() {
  return useQuery({ queryKey: ["intelligence", "fatigue-trend"], queryFn: fetchFatigueTrend });
}
export function useGestureEventsQuery() {
  return useQuery({ queryKey: ["intelligence", "gesture-events"], queryFn: fetchGestureEvents });
}
export function useGestureSummariesQuery() {
  return useQuery({
    queryKey: ["intelligence", "gesture-summaries"],
    queryFn: fetchGestureSummaries,
  });
}
export function useExerciseSetsQuery() {
  return useQuery({ queryKey: ["intelligence", "exercise-sets"], queryFn: fetchExerciseSets });
}
export function useWorkoutTrendQuery() {
  return useQuery({ queryKey: ["intelligence", "workout-trend"], queryFn: fetchWorkoutTrend });
}
export function useMovementPatternQuery() {
  return useQuery({
    queryKey: ["intelligence", "movement-pattern"],
    queryFn: fetchMovementPattern,
  });
}
export function useActivityQualityTrendQuery() {
  return useQuery({
    queryKey: ["intelligence", "activity-quality-trend"],
    queryFn: fetchActivityQualityTrend,
  });
}
export function useInsightsQuery() {
  return useQuery({ queryKey: ["intelligence", "insights"], queryFn: fetchInsights });
}
export function useForecastsQuery() {
  return useQuery({ queryKey: ["intelligence", "forecasts"], queryFn: fetchForecasts });
}
export function useBehaviorTimelineQuery() {
  return useQuery({
    queryKey: ["intelligence", "behavior-timeline"],
    queryFn: fetchBehaviorTimeline,
  });
}

/** Filters out dismissed/completed recommendations via the store, so consumers never need to re-derive that themselves. */
export function useRecommendationsQuery() {
  const query = useQuery({
    queryKey: ["intelligence", "recommendations"],
    queryFn: fetchRecommendations,
  });
  const dismissed = useIntelligenceStore((s) => s.dismissedRecommendationIds);
  const completed = useIntelligenceStore((s) => s.completedRecommendationIds);
  const data = useMemo(() => {
    if (!query.data) return query.data;
    return query.data.filter((r) => !dismissed.has(r.id) && !completed.has(r.id));
  }, [query.data, dismissed, completed]);
  return { ...query, data };
}

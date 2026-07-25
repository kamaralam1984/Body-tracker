/**
 * Real, backend-backed replacement for the attention/posture/fatigue/
 * movement fetchers in `mock-intelligence-service.ts` — same function names
 * and return types, so `use-intelligence-queries.ts` only needs to change
 * its import for these, not the pages that consume the hooks. Forecast,
 * insights, recommendations, and behavior timeline have no real signal yet
 * and stay mock.
 *
 * Backed by `/api/v1/analytics/*`, which read `TrackingMetricSample`/
 * `TrackingEvent`/`ExerciseSet` rows populated by
 * `src/features/tracking/hooks/use-tracking-session-sync.ts` while a real
 * camera session is active. Gestures/movement/exercise data only populates
 * once the user turns on "hand"/"pose" tracking mode (off by default).
 */

import { apiFetchJson } from "@/features/auth";
import type {
  ActivityQualityPoint,
  AttentionSnapshot,
  DistractionEvent,
  ExerciseSet,
  FatigueSnapshot,
  FatigueTrendPoint,
  FocusTimelinePoint,
  GestureEvent,
  GestureSummary,
  MovementPatternPoint,
  PostureSnapshot,
  PostureTrendPoint,
  WorkoutTrendPoint,
} from "../types";

export function fetchAttentionSnapshot(): Promise<AttentionSnapshot> {
  return apiFetchJson<AttentionSnapshot>("/api/v1/analytics/attention");
}

export function fetchFocusTimeline(): Promise<FocusTimelinePoint[]> {
  return apiFetchJson<FocusTimelinePoint[]>("/api/v1/analytics/attention/timeline");
}

export function fetchDistractionEvents(): Promise<DistractionEvent[]> {
  return apiFetchJson<DistractionEvent[]>("/api/v1/analytics/attention/distractions");
}

export function fetchPostureSnapshot(): Promise<PostureSnapshot> {
  return apiFetchJson<PostureSnapshot>("/api/v1/analytics/posture");
}

export function fetchPostureTrend(): Promise<PostureTrendPoint[]> {
  return apiFetchJson<PostureTrendPoint[]>("/api/v1/analytics/posture/trend");
}

export function fetchFatigueSnapshot(): Promise<FatigueSnapshot> {
  return apiFetchJson<FatigueSnapshot>("/api/v1/analytics/fatigue");
}

export function fetchFatigueTrend(): Promise<FatigueTrendPoint[]> {
  return apiFetchJson<FatigueTrendPoint[]>("/api/v1/analytics/fatigue/trend");
}

export function fetchGestureEvents(): Promise<GestureEvent[]> {
  return apiFetchJson<GestureEvent[]>("/api/v1/analytics/gestures/events");
}

export function fetchGestureSummaries(): Promise<GestureSummary[]> {
  return apiFetchJson<GestureSummary[]>("/api/v1/analytics/gestures/summaries");
}

export function fetchMovementPattern(): Promise<MovementPatternPoint[]> {
  return apiFetchJson<MovementPatternPoint[]>("/api/v1/analytics/movement/pattern");
}

export function fetchActivityQualityTrend(): Promise<ActivityQualityPoint[]> {
  return apiFetchJson<ActivityQualityPoint[]>("/api/v1/analytics/movement/quality-trend");
}

export function fetchExerciseSets(): Promise<ExerciseSet[]> {
  return apiFetchJson<ExerciseSet[]>("/api/v1/analytics/exercise-sets");
}

export function fetchWorkoutTrend(): Promise<WorkoutTrendPoint[]> {
  return apiFetchJson<WorkoutTrendPoint[]>("/api/v1/analytics/exercise-sets/workout-trend");
}

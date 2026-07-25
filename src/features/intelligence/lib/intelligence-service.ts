/**
 * Real, backend-backed replacement for the 7 attention/posture/fatigue
 * fetchers in `mock-intelligence-service.ts` — same function names and
 * return types, so `use-intelligence-queries.ts` only needs to change its
 * import for these, not the pages that consume the hooks. Movement,
 * gestures, exercise, forecast, insights, recommendations, and behavior
 * timeline have no real signal yet (see `docs`/plan) and stay mock.
 *
 * Backed by `/api/v1/analytics/{attention,posture,fatigue}*`, which read
 * `TrackingMetricSample`/`TrackingEvent` rows populated by
 * `src/features/tracking/hooks/use-tracking-session-sync.ts` while a real
 * camera session is active.
 */

import { apiFetchJson } from "@/features/auth";
import type {
  AttentionSnapshot,
  DistractionEvent,
  FatigueSnapshot,
  FatigueTrendPoint,
  FocusTimelinePoint,
  PostureSnapshot,
  PostureTrendPoint,
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

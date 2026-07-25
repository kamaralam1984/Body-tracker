"use client";

/**
 * Samples `live.attentionScoreLive/postureScoreLive/fatigueScoreLive`
 * (each updates roughly once per ~10s flush — see
 * `use-tracking-session-sync.ts`) into a rolling in-memory history, then
 * runs `buildLiveInsights()` over it — same deterministic pattern as the
 * server's `analytics-service.ts`, just over this session's live scores
 * instead of persisted daily snapshots.
 *
 * <Insights = useLiveInsights(live) />
 */

import { useEffect, useRef, useState } from "react";
import { buildLiveInsights, type Insight, type LiveScoreSample } from "../lib/build-live-insights";
import type { LiveTrackingStats } from "./use-tracking-session-sync";

const MAX_HISTORY = 20;

export function useLiveInsights(live: LiveTrackingStats): Insight[] {
  const historyRef = useRef<LiveScoreSample[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const lastSampledAttentionRef = useRef<number | null>(null);

  useEffect(() => {
    const { attentionScoreLive, postureScoreLive, fatigueScoreLive } = live;
    if (attentionScoreLive === null || postureScoreLive === null || fatigueScoreLive === null) {
      return;
    }
    // attentionScoreLive only changes once per flush — use that as the
    // natural "a new sample is available" signal rather than a separate timer.
    if (attentionScoreLive === lastSampledAttentionRef.current) return;
    lastSampledAttentionRef.current = attentionScoreLive;

    historyRef.current = [
      ...historyRef.current,
      { attention: attentionScoreLive, posture: postureScoreLive, fatigue: fatigueScoreLive },
    ].slice(-MAX_HISTORY);

    setInsights(buildLiveInsights(historyRef.current));
  }, [live]);

  return insights;
}

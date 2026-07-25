"use client";

/**
 * Bridges live face-tracking to the real backend: while `active`, creates
 * and starts a `TrackingSession`, tallies aggregate stats from every
 * detected frame (never raw landmarks — see the `FLUSH_INTERVAL_MS` window
 * body below for exactly what leaves the browser), flushes a window to
 * `POST /api/v1/tracking/[sessionId]/metrics` every ~10s, and stops the
 * session when tracking ends. This is what makes the Attention/Posture/
 * Wellness dashboards (`src/features/intelligence`) reflect a real camera
 * session instead of demo data.
 *
 * Runs its own read-only loop over `frameRef.current` — deliberately does
 * NOT touch `use-body-tracking.ts`'s detection `tick()`, which stays
 * network-free per its own doc comment.
 *
 * <TrackingProvider>: useTrackingSessionSync({ frameRef, active })
 */

import { useEffect, useRef } from "react";
import { apiFetch, apiFetchJson } from "@/features/auth";
import type { RefObject } from "react";
import type { TrackingFrame } from "../types";

const FLUSH_INTERVAL_MS = 10_000;
const BASELINE_SAMPLE_TARGET = 30; // ~1-2s of frames with a face present
const LONG_CLOSURE_MS = 500; // eye closure this long or longer = microsleep proxy, not a normal blink
const FACE_LOST_DISTRACTION_MS = 3000;
const YAW_EXCURSION_DEG = 30;
const YAW_EXCURSION_MS = 2500;

interface TrackingSessionRecord {
  id: string;
}

type QueuedEvent = {
  type: "distraction" | "drowsiness_alert";
  message: string;
  durationSeconds?: number;
};

interface HeadRotationBaseline {
  pitch: number;
  yaw: number;
  roll: number;
}

/** Mutable per-session tallying state — kept in a ref so accumulation never triggers a re-render. */
interface Accumulator {
  frameCount: number;
  facePresentFrames: number;
  blinkCount: number;
  eyesClosedFrameCount: number;
  longEyeClosureCount: number;
  yawDevSum: number;
  yawDevSumSq: number;
  pitchDevSum: number;
  pitchDevSumSq: number;
  rollDevSum: number;
  rollDevSumSq: number;
  rotationSampleCount: number;
  events: QueuedEvent[];
  windowStart: Date;
}

function freshAccumulator(): Accumulator {
  return {
    frameCount: 0,
    facePresentFrames: 0,
    blinkCount: 0,
    eyesClosedFrameCount: 0,
    longEyeClosureCount: 0,
    yawDevSum: 0,
    yawDevSumSq: 0,
    pitchDevSum: 0,
    pitchDevSumSq: 0,
    rollDevSum: 0,
    rollDevSumSq: 0,
    rotationSampleCount: 0,
    events: [],
    windowStart: new Date(),
  };
}

function meanAndStdDev(
  sum: number,
  sumSq: number,
  count: number,
): { mean: number; stdDev: number } {
  if (count === 0) return { mean: 0, stdDev: 0 };
  const mean = sum / count;
  const variance = Math.max(sumSq / count - mean * mean, 0);
  return { mean, stdDev: Math.sqrt(variance) };
}

export interface UseTrackingSessionSyncOptions {
  frameRef: RefObject<TrackingFrame | null>;
  active: boolean;
}

export function useTrackingSessionSync({ frameRef, active }: UseTrackingSessionSyncOptions): void {
  const sessionIdRef = useRef<string | null>(null);
  const accRef = useRef<Accumulator>(freshAccumulator());
  const baselineRef = useRef<HeadRotationBaseline | null>(null);
  const baselineSamplesRef = useRef<HeadRotationBaseline[]>([]);
  const lastProcessedTimestampRef = useRef<number | null>(null);
  const eyesClosedSinceRef = useRef<number | null>(null);
  const faceLostSinceRef = useRef<number | null>(null);
  const faceLostFlaggedRef = useRef(false);
  const yawExcursionSinceRef = useRef<number | null>(null);
  const yawExcursionFlaggedRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let rafHandle = 0;
    let flushHandle: ReturnType<typeof setInterval> | null = null;

    function processFrame(frame: TrackingFrame) {
      const acc = accRef.current;
      acc.frameCount += 1;

      const face = frame.face;
      if (!face) {
        eyesClosedSinceRef.current = null;
        if (faceLostSinceRef.current === null) {
          faceLostSinceRef.current = frame.timestampMs;
        } else if (
          !faceLostFlaggedRef.current &&
          frame.timestampMs - faceLostSinceRef.current >= FACE_LOST_DISTRACTION_MS
        ) {
          acc.events.push({ type: "distraction", message: "Left the frame" });
          faceLostFlaggedRef.current = true;
        }
        return;
      }

      faceLostSinceRef.current = null;
      faceLostFlaggedRef.current = false;
      acc.facePresentFrames += 1;

      // Blink / eye-closure duration state machine — PERCLOS + microsleep proxy inputs.
      const eyesClosed = face.blink.left && face.blink.right;
      if (eyesClosed) {
        if (eyesClosedSinceRef.current === null) eyesClosedSinceRef.current = frame.timestampMs;
        acc.eyesClosedFrameCount += 1;
      } else if (eyesClosedSinceRef.current !== null) {
        const closedDurationMs = frame.timestampMs - eyesClosedSinceRef.current;
        if (closedDurationMs >= LONG_CLOSURE_MS) {
          acc.longEyeClosureCount += 1;
          acc.events.push({
            type: "drowsiness_alert",
            message: "Eyes closed for an extended period",
            durationSeconds: closedDurationMs / 1000,
          });
        } else {
          acc.blinkCount += 1;
        }
        eyesClosedSinceRef.current = null;
      }

      const rotation = face.headRotation;
      if (!rotation) return;

      // Calibrate a per-session neutral baseline from the first N real
      // samples, then only ever accumulate baseline-relative deviations —
      // the server never sees raw head angles, only how far they drift.
      if (!baselineRef.current) {
        baselineSamplesRef.current.push(rotation);
        if (baselineSamplesRef.current.length >= BASELINE_SAMPLE_TARGET) {
          const samples = baselineSamplesRef.current;
          baselineRef.current = {
            pitch: samples.reduce((s, r) => s + r.pitch, 0) / samples.length,
            yaw: samples.reduce((s, r) => s + r.yaw, 0) / samples.length,
            roll: samples.reduce((s, r) => s + r.roll, 0) / samples.length,
          };
        }
        return;
      }

      const baseline = baselineRef.current;
      const yawDev = rotation.yaw - baseline.yaw;
      const pitchDev = rotation.pitch - baseline.pitch;
      const rollDev = rotation.roll - baseline.roll;

      acc.yawDevSum += yawDev;
      acc.yawDevSumSq += yawDev * yawDev;
      acc.pitchDevSum += pitchDev;
      acc.pitchDevSumSq += pitchDev * pitchDev;
      acc.rollDevSum += rollDev;
      acc.rollDevSumSq += rollDev * rollDev;
      acc.rotationSampleCount += 1;

      // Sustained "looked away" — a distinct distraction signal from face-loss above.
      if (Math.abs(yawDev) >= YAW_EXCURSION_DEG) {
        if (yawExcursionSinceRef.current === null) {
          yawExcursionSinceRef.current = frame.timestampMs;
        } else if (
          !yawExcursionFlaggedRef.current &&
          frame.timestampMs - yawExcursionSinceRef.current >= YAW_EXCURSION_MS
        ) {
          acc.events.push({ type: "distraction", message: "Looked away" });
          yawExcursionFlaggedRef.current = true;
        }
      } else {
        yawExcursionSinceRef.current = null;
        yawExcursionFlaggedRef.current = false;
      }
    }

    function tick() {
      if (cancelled) return;
      const frame = frameRef.current;
      if (frame && frame.timestampMs !== lastProcessedTimestampRef.current) {
        lastProcessedTimestampRef.current = frame.timestampMs;
        processFrame(frame);
      }
      rafHandle = requestAnimationFrame(tick);
    }

    async function flush(isFinal: boolean) {
      const sessionId = sessionIdRef.current;
      const acc = accRef.current;
      if (!sessionId || acc.frameCount === 0) return;

      const windowEnd = new Date();
      const yaw = meanAndStdDev(acc.yawDevSum, acc.yawDevSumSq, acc.rotationSampleCount);
      const pitch = meanAndStdDev(acc.pitchDevSum, acc.pitchDevSumSq, acc.rotationSampleCount);
      const roll = meanAndStdDev(acc.rollDevSum, acc.rollDevSumSq, acc.rotationSampleCount);

      accRef.current = freshAccumulator();

      try {
        await apiFetch(`/api/v1/tracking/${sessionId}/metrics`, {
          method: "POST",
          body: JSON.stringify({
            windowStart: acc.windowStart.toISOString(),
            windowEnd: windowEnd.toISOString(),
            frameCount: acc.frameCount,
            facePresentFrames: acc.facePresentFrames,
            blinkCount: acc.blinkCount,
            eyesClosedFrameCount: acc.eyesClosedFrameCount,
            longEyeClosureCount: acc.longEyeClosureCount,
            avgHeadYawDev: yaw.mean,
            avgHeadPitchDev: pitch.mean,
            avgHeadRollDev: roll.mean,
            yawStdDev: yaw.stdDev,
            pitchStdDev: pitch.stdDev,
            rollStdDev: roll.stdDev,
            events: acc.events.length > 0 ? acc.events.slice(0, 5) : undefined,
          }),
        });
      } catch {
        // Best-effort telemetry — a dropped window just means a slightly
        // sparser dashboard, never something the user needs to see mid-session.
      }

      if (!isFinal) accRef.current.windowStart = windowEnd;
    }

    async function start() {
      try {
        const session = await apiFetchJson<TrackingSessionRecord>("/api/v1/sessions", {
          method: "POST",
          body: JSON.stringify({ title: "Camera session", activityKind: "desk-focus" }),
        });
        await apiFetch(`/api/v1/tracking/${session.id}/start`, { method: "POST" });
        if (cancelled) return;

        sessionIdRef.current = session.id;
        accRef.current = freshAccumulator();
        baselineRef.current = null;
        baselineSamplesRef.current = [];
        lastProcessedTimestampRef.current = null;
        eyesClosedSinceRef.current = null;
        faceLostSinceRef.current = null;
        faceLostFlaggedRef.current = false;
        yawExcursionSinceRef.current = null;
        yawExcursionFlaggedRef.current = false;

        rafHandle = requestAnimationFrame(tick);
        flushHandle = setInterval(() => void flush(false), FLUSH_INTERVAL_MS);
      } catch {
        // No session (e.g. not logged in yet, or backend unreachable) — tracking
        // still works locally, it just won't feed the real dashboards this run.
      }
    }

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafHandle);
      if (flushHandle) clearInterval(flushHandle);

      const sessionId = sessionIdRef.current;
      sessionIdRef.current = null;
      if (!sessionId) return;

      void flush(true).then(() =>
        apiFetch(`/api/v1/tracking/${sessionId}/stop`, { method: "POST" }).catch(() => {
          // Best-effort — an unstopped session just stays "active" server-side.
        }),
      );
    };
    // frameRef is a stable ref object for the lifetime of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

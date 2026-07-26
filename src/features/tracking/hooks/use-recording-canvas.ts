"use client";

/**
 * Composites the live camera frame with the same tracking overlay drawn on
 * screen (`drawTrackingOverlay` — the exact function `TrackingCanvas` uses)
 * into one off-DOM canvas, then exposes it as a `MediaStream` via
 * `canvas.captureStream()`.
 *
 * Why this exists: recording previously ran `MediaRecorder` directly on the
 * camera's raw `MediaStream`, which only ever contains the unmodified
 * camera frames — the skeleton/wireframe/etc. overlay is a separate
 * `<canvas>` layered on top purely in the DOM (see `tracking-overlay.tsx`),
 * never part of the underlying video track. A recording made that way can
 * never show the overlay, no matter what render mode is selected on
 * screen. This hook is the fix: it redraws video + overlay together every
 * frame specifically for the purpose of producing a stream to record.
 *
 * <const { start, stop } = useRecordingCanvas();
 *  const stream = start({ videoEl, frameRef, renderMode, mirrored });>
 */

import { useCallback, useRef } from "react";
import { extrapolateTrackingFrame } from "../lib/render/extrapolate-frame";
import { resolveTrackingColors } from "../lib/render/resolve-tracking-colors";
import { drawTrackingOverlay, type RenderMode } from "../lib/render/render-modes";
import type { TrackingFrame } from "../types";

const CAPTURE_FPS = 30;
const MAX_DETECTION_INTERVAL_MS = 200;
const COLOR_REFRESH_INTERVAL_FRAMES = 60;

export interface CompositeRecordingSource {
  videoEl: HTMLVideoElement;
  frameRef: React.RefObject<TrackingFrame | null>;
  renderMode: RenderMode;
  /** Matches whatever CSS mirroring is actually applied on screen (camera's `settings.mirrored`) — baked into the recorded pixels via a canvas transform, since a recording has no CSS to mirror after the fact. */
  mirrored: boolean;
}

export interface UseRecordingCanvasResult {
  /** Starts compositing and returns a live video MediaStream — caller merges in a mic audio track separately. Returns `null` if the video has no real dimensions yet (camera not actually playing). */
  start: (source: CompositeRecordingSource) => MediaStream | null;
  stop: () => void;
}

export function useRecordingCanvas(): UseRecordingCanvasResult {
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const start = useCallback((source: CompositeRecordingSource): MediaStream | null => {
    const { videoEl, frameRef, renderMode, mirrored } = source;
    const width = videoEl.videoWidth;
    const height = videoEl.videoHeight;
    if (!width || !height) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return null;

    let colors = resolveTrackingColors();
    let frameCount = 0;
    let prevDetectionFrame: TrackingFrame | null = null;
    let currDetectionFrame: TrackingFrame | null = null;
    let currDetectionArrivedAt = 0;
    let detectionIntervalMs = MAX_DETECTION_INTERVAL_MS;

    function draw() {
      frameCount += 1;
      if (frameCount % COLOR_REFRESH_INTERVAL_FRAMES === 0) {
        colors = resolveTrackingColors();
      }

      ctx!.save();
      if (mirrored) {
        ctx!.translate(width, 0);
        ctx!.scale(-1, 1);
      }
      ctx!.drawImage(videoEl, 0, 0, width, height);

      const latest = frameRef.current;
      const now = performance.now();
      if (latest && latest.timestampMs !== currDetectionFrame?.timestampMs) {
        prevDetectionFrame = currDetectionFrame;
        currDetectionFrame = latest;
        detectionIntervalMs = prevDetectionFrame
          ? Math.min(Math.max(now - currDetectionArrivedAt, 16), MAX_DETECTION_INTERVAL_MS)
          : MAX_DETECTION_INTERVAL_MS;
        currDetectionArrivedAt = now;
      }

      if (currDetectionFrame && renderMode !== "camera-only") {
        const elapsedSinceDetection = now - currDetectionArrivedAt;
        const alpha = Math.min(elapsedSinceDetection, detectionIntervalMs) / detectionIntervalMs;
        const frame = extrapolateTrackingFrame(prevDetectionFrame, currDetectionFrame, alpha);
        drawTrackingOverlay(ctx!, frame, renderMode, width, height, colors);
      }
      ctx!.restore();

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);

    return canvas.captureStream(CAPTURE_FPS);
  }, []);

  return { start, stop };
}

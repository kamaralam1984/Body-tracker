"use client";

/**
 * React wiring around `TrackingEngine`. Decoupled from the camera feature —
 * it takes a `videoRef`/`active` flag as input rather than importing
 * anything from `@/features/camera`, so the two features stay independent
 * (the page composes them together).
 *
 * High-frequency landmark data is written to `frameRef` (a plain ref, not
 * React state) so a 30-60Hz detection stream doesn't force a React
 * re-render on every frame — only `status` (which changes rarely) is real
 * state. Canvas renderers should read `frameRef.current` inside their own
 * animation loop.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { TrackingEngine } from "../lib/tracking-engine";
import {
  DEFAULT_TRACKING_CONFIG,
  type ModelsStats,
  type TrackingConfig,
  type TrackingFrame,
  type TrackingMode,
  type TrackingStatus,
} from "../types";

const EMPTY_MODEL_STAT = {
  status: "off",
  confidence: null,
  processingTimeMs: 0,
  modelAsset: null,
} as const;
const EMPTY_MODELS_STATS: ModelsStats = {
  face: EMPTY_MODEL_STAT,
  hand: EMPTY_MODEL_STAT,
  pose: EMPTY_MODEL_STAT,
  segmentation: EMPTY_MODEL_STAT,
  objectDetection: EMPTY_MODEL_STAT,
};

export interface UseBodyTrackingOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Detection only runs while true — tie this to the camera actually playing. */
  active: boolean;
  initialConfig?: Partial<TrackingConfig>;
}

export interface TrackingPerf {
  /** Rolling average of real `performance.now()` deltas around `engine.detectFrame()` — genuinely measured, not estimated. */
  processingTimeMs: number;
  /** Detections actually completed per second over the last ~1s — distinct from the camera's own display FPS. */
  detectionFps: number;
  /** Real cumulative count from `video.getVideoPlaybackQuality().droppedVideoFrames` — `null` where that API doesn't exist (e.g. Firefox/Safari), never a fabricated 0. */
  droppedFrames: number | null;
}

export interface UseBodyTrackingResult {
  status: TrackingStatus;
  frameRef: RefObject<TrackingFrame | null>;
  config: TrackingConfig;
  perf: TrackingPerf;
  /** Per-model (Face/Hand/Pose) live stats for the "AI Model Management" panel — see ModelStat in types.ts. */
  modelsStats: ModelsStats;
  setModes: (modes: Set<TrackingMode>) => void;
  toggleMode: (mode: TrackingMode) => void;
  setQuality: (quality: TrackingConfig["quality"]) => void;
  setSmoothing: (value: number) => void;
  setMirrored: (mirrored: boolean) => void;
  setGestureRecognitionEnabled: (enabled: boolean) => void;
  /** Forces the engine to reinitialize even if modes/quality are unchanged — for a manual "try again" after an error. */
  retry: () => void;
}

const PERF_PUSH_INTERVAL_MS = 500;
const PERF_SAMPLE_CAP = 60;

function modesKeyOf(modes: Set<TrackingMode>): string {
  return Array.from(modes).sort().join(",");
}

export function useBodyTracking({
  videoRef,
  active,
  initialConfig,
}: UseBodyTrackingOptions): UseBodyTrackingResult {
  const [config, setConfig] = useState<TrackingConfig>(() => ({
    ...DEFAULT_TRACKING_CONFIG,
    ...initialConfig,
    modes: new Set(initialConfig?.modes ?? DEFAULT_TRACKING_CONFIG.modes),
  }));
  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [retryToken, setRetryToken] = useState(0);
  const frameRef = useRef<TrackingFrame | null>(null);
  const engineRef = useRef<TrackingEngine | null>(null);
  const perfSamplesRef = useRef<{ processingMs: number[]; frameTimestamps: number[] }>({
    processingMs: [],
    frameTimestamps: [],
  });
  const [perf, setPerf] = useState<TrackingPerf>({
    processingTimeMs: 0,
    detectionFps: 0,
    droppedFrames: null,
  });
  const [modelsStats, setModelsStats] = useState<ModelsStats>(EMPTY_MODELS_STATS);

  if (engineRef.current == null) {
    engineRef.current = new TrackingEngine(config);
  }

  const modesKey = useMemo(() => modesKeyOf(config.modes), [config.modes]);

  // (Re)initialize / reconfigure the engine whenever which modes are enabled
  // or the quality tier changes — both require creating/closing landmarkers.
  // No modes enabled needs no engine work at all; `effectiveStatus` below
  // derives "idle" directly from config instead of a state transition here.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || config.modes.size === 0) return;

    let cancelled = false;
    setStatus("initializing");

    (async () => {
      try {
        if (!engine.isReady()) {
          await engine.initialize();
        } else if (retryToken > 0) {
          await engine.retry();
        } else {
          await engine.updateConfig(config);
        }
      } catch {
        // status already reflects the failure via engine.getStatus()
      }
      if (!cancelled) setStatus(engine.getStatus());
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- modesKey is the intentional stand-in for config.modes
  }, [modesKey, config.quality, retryToken]);

  // Live-apply smoothing/mirroring without recreating any landmarker.
  useEffect(() => {
    void engineRef.current?.updateConfig({
      smoothing: config.smoothing,
      mirrored: config.mirrored,
    });
  }, [config.smoothing, config.mirrored]);

  // The detection loop — one requestVideoFrameCallback (falling back to rAF)
  // per active frame, gated on the camera actually being active.
  useEffect(() => {
    const engine = engineRef.current;
    const video = videoRef.current;
    if (!engine || !video || !active || config.modes.size === 0) return;

    let cancelled = false;
    let rafHandle: number | null = null;
    let vfcHandle: number | null = null;
    let perfPushHandle: ReturnType<typeof setInterval> | null = null;

    function scheduleNext() {
      if (cancelled || !video) return;
      if (typeof video.requestVideoFrameCallback === "function") {
        vfcHandle = video.requestVideoFrameCallback((_now, metadata) =>
          tick(metadata.mediaTime * 1000),
        );
      } else {
        rafHandle = requestAnimationFrame(() => tick(performance.now()));
      }
    }

    function tick(timestampMs: number) {
      if (cancelled || !engine || !video) return;
      if (engine.isReady() && video.readyState >= video.HAVE_CURRENT_DATA) {
        const start = performance.now();
        const result = engine.detectFrame(video, Math.round(timestampMs));
        const processingMs = performance.now() - start;
        frameRef.current = result;

        const samples = perfSamplesRef.current;
        samples.processingMs.push(processingMs);
        samples.frameTimestamps.push(performance.now());
        if (samples.processingMs.length > PERF_SAMPLE_CAP) samples.processingMs.shift();
        if (samples.frameTimestamps.length > PERF_SAMPLE_CAP) samples.frameTimestamps.shift();

        const nextStatus = engine.getStatus();
        setStatus((prev) => (prev === nextStatus ? prev : nextStatus));
      }
      scheduleNext();
    }

    scheduleNext();

    // Pushed to React state at a bounded rate — real detection runs at up
    // to 30-60Hz, far too often to re-render on every sample.
    perfPushHandle = setInterval(() => {
      const samples = perfSamplesRef.current;
      const avgProcessingMs =
        samples.processingMs.length > 0
          ? samples.processingMs.reduce((s, v) => s + v, 0) / samples.processingMs.length
          : 0;
      const timestamps = samples.frameTimestamps;
      const windowSeconds =
        timestamps.length > 1 ? (timestamps[timestamps.length - 1]! - timestamps[0]!) / 1000 : 0;
      const detectionFps = windowSeconds > 0 ? (timestamps.length - 1) / windowSeconds : 0;
      const droppedFrames =
        typeof video.getVideoPlaybackQuality === "function"
          ? video.getVideoPlaybackQuality().droppedVideoFrames
          : null;
      setPerf({ processingTimeMs: avgProcessingMs, detectionFps, droppedFrames });
      setModelsStats(engine.getModelStats());
    }, PERF_PUSH_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (rafHandle !== null) cancelAnimationFrame(rafHandle);
      if (vfcHandle !== null && typeof video.cancelVideoFrameCallback === "function") {
        video.cancelVideoFrameCallback(vfcHandle);
      }
      if (perfPushHandle !== null) clearInterval(perfPushHandle);
      frameRef.current = null;
    };
    // config.modes.size is intentionally represented by `modesKey` above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, modesKey, videoRef]);

  // Dispose the engine when the owning component unmounts entirely.
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  const setModes = useCallback((modes: Set<TrackingMode>) => {
    setConfig((prev) => ({ ...prev, modes: new Set(modes) }));
  }, []);

  const toggleMode = useCallback((mode: TrackingMode) => {
    setConfig((prev) => {
      const next = new Set(prev.modes);
      if (next.has(mode)) next.delete(mode);
      else next.add(mode);
      return { ...prev, modes: next };
    });
  }, []);

  const setQuality = useCallback((quality: TrackingConfig["quality"]) => {
    setConfig((prev) => ({ ...prev, quality }));
  }, []);

  const setSmoothing = useCallback((value: number) => {
    setConfig((prev) => ({ ...prev, smoothing: value }));
  }, []);

  const setMirrored = useCallback((mirrored: boolean) => {
    setConfig((prev) => ({ ...prev, mirrored }));
  }, []);

  const setGestureRecognitionEnabled = useCallback((enabled: boolean) => {
    setConfig((prev) => ({ ...prev, gestureRecognitionEnabled: enabled }));
  }, []);

  const retry = useCallback(() => {
    setRetryToken((prev) => prev + 1);
  }, []);

  const effectiveStatus: TrackingStatus = config.modes.size === 0 ? "idle" : status;

  return {
    status: effectiveStatus,
    frameRef,
    config,
    perf,
    modelsStats,
    setModes,
    toggleMode,
    setQuality,
    setSmoothing,
    setMirrored,
    setGestureRecognitionEnabled,
    retry,
  };
}

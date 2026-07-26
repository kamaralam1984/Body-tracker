"use client";

/**
 * Shares one `useBodyTracking` instance across the tracking overlay, status
 * badge, and legend/settings controls. Takes the video element and an
 * `active` flag as props rather than reaching into `@/features/camera`
 * directly — the page is what wires the two features together.
 *
 * <TrackingProvider videoRef={videoRef} active={status === "running"}>
 *   <TrackingOverlay containerRef={cardRef} />
 *   <TrackingStatus />
 * </TrackingProvider>
 */

import { createContext, useContext, useRef, useState, type RefObject } from "react";
import {
  useBodyTracking,
  type UseBodyTrackingOptions,
  type UseBodyTrackingResult,
} from "../hooks/use-body-tracking";
import { useTrackingSessionSync, type LiveTrackingStats } from "../hooks/use-tracking-session-sync";
import {
  useSessionRecording,
  type UseSessionRecordingResult,
} from "../hooks/use-session-recording";
import type { RenderMode } from "../lib/render/render-modes";

export interface RenderPerf {
  /** Real `performance.now()` time spent in `TrackingCanvas`'s draw loop, rolling-averaged — written directly by the canvas each frame, not React state, so it never forces a re-render. */
  renderTimeMs: number;
}

export interface TrackingContextValue extends UseBodyTrackingResult {
  /** Live camera-page stats (session summary, timeline, face/hand/pose readouts) — see use-tracking-session-sync.ts. */
  live: LiveTrackingStats;
  /** Which overlay visualization `TrackingCanvas` draws — a rendering concern, independent of the detection engine's own `config`. */
  renderMode: RenderMode;
  setRenderMode: (mode: RenderMode) => void;
  /** Written by `TrackingCanvas` every animation frame; poll it (don't subscribe) — see `developer-mode-panel.tsx`. */
  renderPerfRef: RefObject<RenderPerf>;
  /** A single shared recording session — lives here (not inside `RecordingExportPanel`) so other components (e.g. `CameraTopBar`'s REC indicator) can read `isRecording` without creating a second, independent `MediaRecorder`. */
  recording: UseSessionRecordingResult;
}

const TrackingContext = createContext<TrackingContextValue | null>(null);

interface TrackingProviderProps extends UseBodyTrackingOptions {
  children: React.ReactNode;
}

export function TrackingProvider({ children, ...options }: TrackingProviderProps) {
  const tracking = useBodyTracking(options);
  // Feeds real Attention/Posture/Wellness/Movement data from this session —
  // see use-tracking-session-sync.ts. Deliberately a sibling to
  // useBodyTracking, not inside it, so the core detection hook stays
  // network-free. Its `live` return value also powers the camera page's
  // live session-summary/timeline/alerts/analytics panels.
  const { live } = useTrackingSessionSync({ frameRef: tracking.frameRef, active: options.active });
  const [renderMode, setRenderMode] = useState<RenderMode>("skeleton");
  const renderPerfRef = useRef<RenderPerf>({ renderTimeMs: 0 });
  const recording = useSessionRecording();
  return (
    <TrackingContext.Provider
      value={{ ...tracking, live, renderMode, setRenderMode, renderPerfRef, recording }}
    >
      {children}
    </TrackingContext.Provider>
  );
}

export function useTrackingContext(): TrackingContextValue {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error("useTrackingContext must be used within a TrackingProvider");
  return ctx;
}

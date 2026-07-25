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

import { createContext, useContext } from "react";
import {
  useBodyTracking,
  type UseBodyTrackingOptions,
  type UseBodyTrackingResult,
} from "../hooks/use-body-tracking";
import { useTrackingSessionSync } from "../hooks/use-tracking-session-sync";

const TrackingContext = createContext<UseBodyTrackingResult | null>(null);

interface TrackingProviderProps extends UseBodyTrackingOptions {
  children: React.ReactNode;
}

export function TrackingProvider({ children, ...options }: TrackingProviderProps) {
  const tracking = useBodyTracking(options);
  // Feeds real Attention/Posture/Wellness data from this session — see
  // use-tracking-session-sync.ts. Deliberately a sibling to useBodyTracking,
  // not inside it, so the core detection hook stays network-free.
  useTrackingSessionSync({ frameRef: tracking.frameRef, active: options.active });
  return <TrackingContext.Provider value={tracking}>{children}</TrackingContext.Provider>;
}

export function useTrackingContext(): UseBodyTrackingResult {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error("useTrackingContext must be used within a TrackingProvider");
  return ctx;
}

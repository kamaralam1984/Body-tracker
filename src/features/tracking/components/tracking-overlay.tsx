"use client";

/**
 * Thin composition wrapper: positions `TrackingCanvas` to match
 * `CameraCard`'s own rounded bounds and fades it in/out as tracking starts
 * and stops, so a subject appearing/disappearing never hard-cuts. This is
 * the component the page renders alongside `CameraCard`:
 *
 * <div className="relative">
 *   <CameraCard ref={cardRef} />
 *   <TrackingOverlay containerRef={cardRef} />
 * </div>
 */

import { useState, type RefObject } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTrackingContext } from "../context/tracking-provider";
import { TrackingCanvas } from "./tracking-canvas";

interface TrackingOverlayProps {
  containerRef: RefObject<HTMLElement | null>;
  className?: string;
}

export function TrackingOverlay({ containerRef, className }: TrackingOverlayProps) {
  const { status } = useTrackingContext();
  const isActive = status !== "idle";

  // Read once — this is a preference, not something that needs to react to
  // being changed mid-session.
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  return (
    <motion.div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-2xl", className)}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <TrackingCanvas containerRef={containerRef} className="h-full w-full" />
    </motion.div>
  );
}

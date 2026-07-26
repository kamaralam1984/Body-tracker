"use client";

/**
 * Pure CSS/SVG composition-guide overlay — rule of thirds, center
 * crosshair, golden ratio, or safe-margins. Purely visual, never touches
 * the actual video/recording.
 *
 * <GridOverlay mode={settings.gridOverlay} />
 */

import { cn } from "@/lib/utils";
import type { GridOverlayMode } from "../types";

const LINE = "absolute bg-white/40";
const GOLDEN_RATIO = 0.382; // 1/φ² — the golden-ratio guide line position from each edge

export function GridOverlay({ mode, className }: { mode: GridOverlayMode; className?: string }) {
  if (mode === "off") return null;

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {mode === "thirds" && (
        <>
          <div className={cn(LINE, "top-1/3 h-px w-full")} />
          <div className={cn(LINE, "top-2/3 h-px w-full")} />
          <div className={cn(LINE, "left-1/3 h-full w-px")} />
          <div className={cn(LINE, "left-2/3 h-full w-px")} />
        </>
      )}

      {mode === "golden" && (
        <>
          <div className={cn(LINE, "h-px w-full")} style={{ top: `${GOLDEN_RATIO * 100}%` }} />
          <div
            className={cn(LINE, "h-px w-full")}
            style={{ top: `${(1 - GOLDEN_RATIO) * 100}%` }}
          />
          <div className={cn(LINE, "h-full w-px")} style={{ left: `${GOLDEN_RATIO * 100}%` }} />
          <div
            className={cn(LINE, "h-full w-px")}
            style={{ left: `${(1 - GOLDEN_RATIO) * 100}%` }}
          />
        </>
      )}

      {mode === "crosshair" && (
        <>
          <div className={cn(LINE, "top-1/2 h-px w-full")} />
          <div className={cn(LINE, "left-1/2 h-full w-px")} />
          <div className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50" />
        </>
      )}

      {mode === "safe-margins" && (
        <div className="absolute inset-[8%] border border-dashed border-white/40" />
      )}
    </div>
  );
}

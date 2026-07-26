"use client";

/**
 * The main control pill (`CameraToolbar`), docked over the bottom of the
 * video instead of sitting below it — auto-hides after a few seconds of no
 * pointer activity over the video (`useIdleVisibility`), same behavior as
 * Meet/Zoom/OBS's floating control clusters. Reduced-motion users get it
 * always visible (see the hook itself).
 *
 * <FloatingControlDock containerRef={fullscreenTargetRef} onScreenshot={setScreenshot} />
 */

import { cn } from "@/lib/utils";
import { useIdleVisibility } from "../hooks/use-idle-visibility";
import { CameraToolbar } from "./camera-toolbar";

interface FloatingControlDockProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onScreenshot?: (dataUrl: string) => void;
  className?: string;
}

export function FloatingControlDock({
  containerRef,
  onScreenshot,
  className,
}: FloatingControlDockProps) {
  const visible = useIdleVisibility(containerRef);

  return (
    <div
      // `inert` (not just opacity/pointer-events) so a hidden dock's buttons
      // also drop out of the tab order — otherwise keyboard users could tab
      // into controls that are invisible on screen.
      inert={!visible}
      className={cn(
        "absolute inset-x-0 bottom-0 z-10 flex justify-center px-3 pb-3",
        "transition-opacity duration-300",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
        className,
      )}
    >
      <CameraToolbar onScreenshot={onScreenshot} />
    </div>
  );
}

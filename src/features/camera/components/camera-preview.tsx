"use client";

import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";

interface CameraPreviewProps {
  className?: string;
}

// Slider is a 0-100 scale with 50 = neutral (matches the existing UI's
// default) — maps onto the real CSS filter percentage range, where 100% is
// the browser's own neutral value.
function adjustmentFilter(value: number): number {
  return 50 + value;
}

/** The raw video surface — mirrored per settings, fades in once a frame is playing, with real brightness/contrast/saturation applied via CSS `filter`. */
export function CameraPreview({ className }: CameraPreviewProps) {
  const { videoRef, settings, status } = useCameraContext();
  const isVisible =
    status === "running" || status === "paused" || status === "ready" || status === "reconnecting";

  const { brightness, contrast, saturation } = settings.adjustments;
  const filter = `brightness(${adjustmentFilter(brightness)}%) contrast(${adjustmentFilter(contrast)}%) saturate(${adjustmentFilter(saturation)}%)`;

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{ filter }}
      className={cn(
        "h-full w-full object-cover transition-opacity duration-500 ease-out",
        settings.mirrored && "-scale-x-100",
        isVisible ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}

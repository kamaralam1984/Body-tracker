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

// A real, simple exposure/contrast boost (not a learned model) — stacks on
// top of whatever the user already set manually via the sliders.
const LOW_LIGHT_BRIGHTNESS_BOOST = 35;
const LOW_LIGHT_CONTRAST_BOOST = 15;

/** The raw video surface — mirrored per settings, fades in once a frame is playing, with real brightness/contrast/saturation applied via CSS `filter`. */
export function CameraPreview({ className }: CameraPreviewProps) {
  const { videoRef, settings, status } = useCameraContext();
  const isVisible =
    status === "running" || status === "paused" || status === "ready" || status === "reconnecting";

  const { brightness, contrast, saturation } = settings.adjustments;
  const boost = settings.lowLightBoost;
  const filter = `brightness(${adjustmentFilter(brightness) + (boost ? LOW_LIGHT_BRIGHTNESS_BOOST : 0)}%) contrast(${adjustmentFilter(contrast) + (boost ? LOW_LIGHT_CONTRAST_BOOST : 0)}%) saturate(${adjustmentFilter(saturation)}%)`;

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

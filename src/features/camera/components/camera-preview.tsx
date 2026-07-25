"use client";

import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";

interface CameraPreviewProps {
  className?: string;
}

/** The raw video surface — mirrored per settings, fades in once a frame is playing. */
export function CameraPreview({ className }: CameraPreviewProps) {
  const { videoRef, settings, status } = useCameraContext();
  const isVisible =
    status === "running" || status === "paused" || status === "ready" || status === "reconnecting";

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={cn(
        "h-full w-full object-cover transition-opacity duration-500 ease-out",
        settings.mirrored && "-scale-x-100",
        isVisible ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}

"use client";

/**
 * Front/back camera flip — only renders when more than one video input
 * exists (mobile devices typically expose 2+, desktop webcams usually just
 * 1) so it never appears as a dead control. Restarts the stream with the
 * opposite `facingMode` as an `ideal` constraint, so a device that ignores
 * facing mode just keeps its current camera rather than failing.
 *
 * <CameraFlipButton />
 */

import { useState } from "react";
import { SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";

interface CameraFlipButtonProps {
  className?: string;
}

export function CameraFlipButton({ className }: CameraFlipButtonProps) {
  const { devices, flipFacing, status, isSupported } = useCameraContext();
  const [flipping, setFlipping] = useState(false);

  if (devices.length < 2) return null;

  const canFlip =
    isSupported && (status === "running" || status === "paused" || status === "ready");

  async function handleClick() {
    setFlipping(true);
    try {
      await flipFacing();
    } finally {
      setFlipping(false);
    }
  }

  return (
    <Tooltip content="Switch camera">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={!canFlip || flipping}
        aria-label="Switch camera"
        onClick={handleClick}
        className={cn(
          "bg-muted text-muted-foreground hover:bg-muted/80 size-11 rounded-full sm:size-12",
          className,
        )}
      >
        <SwitchCamera className={cn("size-4", flipping && "animate-pulse")} strokeWidth={1.75} />
      </Button>
    </Tooltip>
  );
}

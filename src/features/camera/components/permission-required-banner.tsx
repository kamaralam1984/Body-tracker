"use client";

/**
 * Lightweight, dismissible, non-modal camera-permission notice for inline
 * placement on a page (e.g. above `CameraCard`) instead of a blocking
 * `PermissionDialog`. Renders nothing unless the camera is actually
 * waiting on permission.
 *
 * <PermissionRequiredBanner className="mb-4" />
 */

import { useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";

interface PermissionRequiredBannerProps {
  className?: string;
}

export function PermissionRequiredBanner({ className }: PermissionRequiredBannerProps) {
  const { status, start } = useCameraContext();
  const [dismissed, setDismissed] = useState(false);

  if (status !== "permission-required" || dismissed) return null;

  return (
    <div
      role="alert"
      className={cn(
        "border-info-bg bg-info-bg flex items-center gap-3 rounded-lg border p-4 text-sm",
        className,
      )}
    >
      <Camera className="text-info-500 size-5 shrink-0" strokeWidth={1.75} />
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-foreground font-medium">Camera access needed</p>
        <p className="text-muted-foreground">Allow camera access to start your session preview.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" variant="accent" onClick={() => start()}>
          Allow access
        </Button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors"
        >
          <X className="size-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

"use client";

/**
 * The large preview card — rounded, soft-shadowed frame that hosts
 * `CameraPreview` plus a status-driven overlay (loading, paused, empty,
 * error) so callers never have to branch on `status` themselves.
 *
 * <CameraCard action={<Button onClick={start}>Start camera</Button>} />
 */

import { forwardRef } from "react";
import {
  Camera,
  CameraOff,
  Loader2,
  RefreshCw,
  ShieldAlert,
  VideoOff,
  WifiOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";
import { CameraPreview } from "./camera-preview";
import type { CameraAspectRatio } from "../types";

const STATUS_COPY: Partial<
  Record<string, { icon: LucideIcon; title: string; description: string }>
> = {
  idle: {
    icon: Camera,
    title: "Camera is off",
    description: "Start your camera to begin the preview.",
  },
  initializing: {
    icon: Loader2,
    title: "Starting camera…",
    description: "Requesting access to your camera.",
  },
  waiting: { icon: Loader2, title: "Preparing preview…", description: "Just a moment." },
  "permission-required": {
    icon: ShieldAlert,
    title: "Camera permission needed",
    description: "Allow access to start your preview.",
  },
  "permission-denied": {
    icon: ShieldAlert,
    title: "Camera access denied",
    description: "Enable camera access in your browser settings to continue.",
  },
  "device-not-found": {
    icon: VideoOff,
    title: "No camera found",
    description: "Connect a camera and try again.",
  },
  "camera-busy": {
    icon: CameraOff,
    title: "Camera unavailable",
    description: "Another app may be using this camera.",
  },
  "camera-error": {
    icon: CameraOff,
    title: "Camera error",
    description: "Something went wrong. Try refreshing the camera.",
  },
  reconnecting: {
    icon: RefreshCw,
    title: "Reconnecting…",
    description: "Trying to restore your camera connection.",
  },
  stopped: {
    icon: Camera,
    title: "Camera stopped",
    description: "Start your camera to resume the preview.",
  },
  unsupported: {
    icon: WifiOff,
    title: "Camera not supported",
    description: "Your browser doesn't support camera access.",
  },
};

interface CameraCardProps {
  action?: React.ReactNode;
  className?: string;
  aspectRatio?: CameraAspectRatio;
}

const aspectClassMap: Record<CameraAspectRatio, string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
  "9:16": "aspect-[9/16]",
};

export const CameraCard = forwardRef<HTMLDivElement, CameraCardProps>(function CameraCard(
  { action, className, aspectRatio = "16:9" },
  ref,
) {
  const { status } = useCameraContext();
  const copy = STATUS_COPY[status];
  const showOverlay = status !== "running";
  const isSpinning = status === "initializing" || status === "waiting" || status === "reconnecting";

  return (
    <div
      ref={ref}
      className={cn(
        "border-border relative w-full overflow-hidden rounded-2xl border bg-neutral-950 shadow-lg",
        aspectClassMap[aspectRatio],
        className,
      )}
    >
      <CameraPreview />

      {showOverlay && copy && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-neutral-950/95 px-6 text-center backdrop-blur-sm">
          <div className="flex size-14 items-center justify-center rounded-full bg-white/5">
            {isSpinning ? (
              <Spinner size="lg" className="text-neutral-300" />
            ) : (
              <copy.icon className="size-6 text-neutral-300" strokeWidth={1.75} />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-neutral-50">{copy.title}</p>
            <p className="max-w-xs text-sm text-neutral-400">{copy.description}</p>
          </div>
          {action}
        </div>
      )}

      {status === "paused" && (
        <div className="absolute top-4 left-4">
          <Badge variant="warning">Paused</Badge>
        </div>
      )}

      {status === "reconnecting" && (
        <div className="absolute top-4 left-4">
          <Badge variant="warning">Reconnecting…</Badge>
        </div>
      )}
    </div>
  );
});

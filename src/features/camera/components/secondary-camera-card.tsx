"use client";

/**
 * A second, independent camera feed — purely presentational, driven by a
 * `UseCameraResult` passed in as a prop (its own separate `useCamera()`
 * instance, owned by the page, not context) rather than reusing
 * `CameraCard`/`useCameraContext()`, which are hard-wired to the single
 * "primary" camera context. Deliberately simpler than the primary camera's
 * full toolbar/settings-drawer stack — just a live preview, a device
 * picker, start/stop, and (via `isActiveForTracking`/`onSetActive`) the
 * control for which of the two cameras the AI models actually run against.
 *
 * <SecondaryCameraCard camera={secondaryCamera} isActiveForTracking={activeCameraId === "secondary"} onSetActive={...} />
 */

import { Camera, Loader2, RefreshCw, Video, VideoOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, type SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { UseCameraResult } from "../hooks/use-camera";

interface SecondaryCameraCardProps {
  camera: UseCameraResult;
  isActiveForTracking: boolean;
  onSetActive: () => void;
  className?: string;
}

export function SecondaryCameraCard({
  camera,
  isActiveForTracking,
  onSetActive,
  className,
}: SecondaryCameraCardProps) {
  const { status, videoRef, devices, settings, switchDevice, start, stop, refresh, isSupported } =
    camera;
  const isRunningLike = status === "running" || status === "paused" || status === "ready";
  const isStarting = status === "initializing" || status === "waiting" || status === "reconnecting";
  const isVisible = isRunningLike || status === "reconnecting";

  const deviceOptions: SelectOption[] = devices.map((d) => ({
    value: d.deviceId,
    label: d.label,
  }));

  return (
    <Card className={cn("border-border relative aspect-video w-full overflow-hidden", className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "h-full w-full bg-neutral-950 object-cover transition-opacity duration-500 ease-out",
          isVisible ? "opacity-100" : "opacity-0",
        )}
      />

      {!isVisible && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950/95 px-4 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-white/5">
            {isStarting ? (
              <Loader2 className="size-5 animate-spin text-neutral-300" strokeWidth={1.75} />
            ) : (
              <Camera className="size-5 text-neutral-300" strokeWidth={1.75} />
            )}
          </div>
          <p className="text-sm text-neutral-300">
            {isStarting ? "Starting second camera…" : "Second camera off"}
          </p>
        </div>
      )}

      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent p-2.5">
        <span className="text-xs font-medium text-white/90">Camera 2</span>
        {isActiveForTracking && <Badge variant="success">Tracking</Badge>}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 bg-gradient-to-t from-black/60 to-transparent p-2.5">
        {deviceOptions.length > 1 && (
          <Select
            options={deviceOptions}
            value={settings.deviceId}
            onValueChange={(id) => void switchDevice(id)}
            className="h-8 min-w-0 flex-1 text-xs"
          />
        )}
        <Button
          type="button"
          size="sm"
          variant={isRunningLike ? "danger" : "primary"}
          disabled={!isSupported || isStarting}
          onClick={() => (isRunningLike ? stop() : void start())}
        >
          {isRunningLike ? <VideoOff /> : <Video />}
          {isRunningLike ? "Stop" : "Start"}
        </Button>
        {isRunningLike && (
          <Button type="button" size="sm" variant="ghost" onClick={() => void refresh()}>
            <RefreshCw />
          </Button>
        )}
        {isRunningLike && (
          <Button
            type="button"
            size="sm"
            variant={isActiveForTracking ? "outline" : "primary"}
            disabled={isActiveForTracking}
            onClick={onSetActive}
          >
            {isActiveForTracking ? "Tracking this camera" : "Track this camera"}
          </Button>
        )}
      </div>
    </Card>
  );
}

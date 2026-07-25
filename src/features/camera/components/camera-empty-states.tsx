/**
 * Camera-specific EmptyState presets, following the pattern in
 * `src/components/ui/empty-state-presets.tsx` — thin wrappers around the
 * base `EmptyState` with camera-flavored defaults, each field overridable.
 *
 * These are for placements OUTSIDE the live preview card (e.g. a dashboard
 * tile, a pre-navigation status card, a full "browser unsupported" screen).
 * `CameraCard` already renders its own in-card status overlay for the live
 * preview itself — don't reach for these to replace that.
 */

import { Ban, ShieldOff, VideoOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface PresetProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function NoCameraEmptyState({
  title = "No camera detected",
  description = "Connect a camera to your device to get started.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={VideoOff}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function CameraDisabledEmptyState({
  title = "Camera is turned off",
  description = "Turn on your camera to start the preview.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={Ban}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function WaitingForCameraEmptyState({
  title = "Waiting for camera…",
  description = "This will just take a moment.",
  action,
  className,
}: PresetProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <Spinner size="md" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-foreground text-sm font-medium">{title}</p>
        {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function BrowserUnsupportedEmptyState({
  title = "Camera not supported",
  description = "Your browser doesn't support camera access. Try the latest version of Chrome, Firefox, Safari, or Edge.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={ShieldOff}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

/**
 * Tracking-specific EmptyState presets, following the pattern in
 * `src/features/camera/components/camera-empty-states.tsx` — thin wrappers
 * around the base `EmptyState` with tracking-flavored defaults, each field
 * overridable.
 *
 * These are compact/inline notices, not page-level takeovers: the camera
 * preview itself is still showing live video underneath even when tracking
 * specifically fails or isn't supported, so both presets override the base
 * `EmptyState`'s vertical padding down to `py-6`.
 */

import { AlertCircle, ScanFace } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface PresetProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function TrackingUnavailableEmptyState({
  title = "Tracking unavailable",
  description = "This browser doesn't support the tracking engine.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={ScanFace}
      title={title}
      description={description}
      action={action}
      className={cn("py-6", className)}
    />
  );
}

export function TrackingErrorEmptyState({
  title = "Tracking couldn't start",
  description = "Something went wrong. Try turning tracking off and on again.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={action}
      className={cn("py-6", className)}
    />
  );
}

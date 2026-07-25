/**
 * Named EmptyState presets for the session-analytics dashboard — follows the
 * same thin-wrapper pattern as `src/components/ui/empty-state-presets.tsx`.
 * Override any field, e.g. <NoActivityEmptyState description="..." />
 */

import { Activity, Radio } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface PresetProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function NoSessionsEmptyState({
  title = "No sessions yet",
  description = "Start your camera to begin your first tracked session.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={Activity}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoActivityEmptyState({
  title = "No activity recorded",
  description = "Activity will appear here once tracking detects movement.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={Radio}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

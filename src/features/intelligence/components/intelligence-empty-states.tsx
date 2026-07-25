/**
 * Following `src/components/ui/empty-state-presets.tsx`'s exact pattern —
 * every field overridable via props.
 */

import { CalendarClock, Lightbulb, ListChecks, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface PresetProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function NoInsightsEmptyState({
  title = "No insights yet",
  description = "Insights build up as more tracking data comes in.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={Lightbulb}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoRecommendationsEmptyState({
  title = "You're all caught up",
  description = "No recommendations right now — check back after your next session.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={Sparkles}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoSessionsEmptyState({
  title = "No sessions yet",
  description = "Start a live session to begin building your intelligence profile.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={CalendarClock}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoHistoryEmptyState({
  title = "No history yet",
  description = "Activity will show up here as it's tracked over time.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={ListChecks}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

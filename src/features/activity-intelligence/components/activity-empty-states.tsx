/**
 * Named EmptyState presets for the activity-intelligence module — follows
 * `empty-state-presets.tsx`'s exact pattern. Every field overridable, e.g.
 * <NoActivityEmptyState action={<Button>Start session</Button>} />
 */

import { Activity, GanttChartSquare, History, SearchX, Video } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface PresetProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function NoActivityEmptyState({
  title = "No activity detected yet",
  description = "Start a live camera session to begin tracking activity.",
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

export function NoHistoryEmptyState({
  title = "No activity history yet",
  description = "Your tracked activity will show up here over time.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={History}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoTimelineEmptyState({
  title = "No timeline events yet",
  description = "Activity events will appear here as they're detected.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={GanttChartSquare}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoSessionsEmptyState({
  title = "No sessions found",
  description = "Try adjusting your filters or start a new session.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={Video}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoResultsEmptyState({
  title = "No results match your search",
  description = "Try a different search term or clear your filters.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={SearchX}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

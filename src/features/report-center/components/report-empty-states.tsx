/**
 * Named EmptyState presets for the report library, following
 * `empty-state-presets.tsx`'s exact pattern — every field overridable, e.g.
 * <NoResultsEmptyState description="Try a different search term." />
 */

import { Archive, CalendarClock, FileBarChart, SearchX, Star } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface PresetProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function NoReportsEmptyState({
  title = "No reports yet",
  description = "Generate your first report to see it here.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={FileBarChart}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoResultsEmptyState({
  title = "No reports match your search",
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

export function NoFavoritesEmptyState({
  title = "No favorite reports",
  description = "Star a report to pin it here for quick access.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={Star}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoScheduledEmptyState({
  title = "No scheduled reports",
  description = "Reports you schedule will appear here before they run.",
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

export function NoArchivedEmptyState({
  title = "Nothing archived",
  description = "Archived reports will show up here.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={Archive}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

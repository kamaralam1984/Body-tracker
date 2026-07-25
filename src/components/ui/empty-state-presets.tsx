/**
 * Named EmptyState presets for common cases — override any field, e.g.
 * <NoResultsEmptyState description="Try a different search term." />
 */

import { Database, Lock, SearchX, WifiOff, Wrench } from "lucide-react";
import { EmptyState } from "./empty-state";

interface PresetProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function NoDataEmptyState({
  title = "No data yet",
  description = "Once activity starts, it will show up here.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={Database}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoResultsEmptyState({
  title = "No results found",
  description = "Try adjusting your filters or search terms.",
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

export function SearchEmptyState({
  title = "Nothing matches your search",
  description = "Check the spelling or try a broader term.",
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

export function NoInternetEmptyState({
  title = "You're offline",
  description = "Check your connection and try again.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={WifiOff}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoPermissionEmptyState({
  title = "You don't have access",
  description = "Ask a workspace admin to grant you permission.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={Lock}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function MaintenanceEmptyState({
  title = "Under maintenance",
  description = "This area is temporarily unavailable while we make improvements.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={Wrench}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

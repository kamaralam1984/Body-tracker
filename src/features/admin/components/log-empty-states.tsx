/**
 * Named EmptyState presets for the Activity/Audit log page, following the
 * pattern in `src/components/ui/empty-state-presets.tsx` — override any
 * field, e.g. <NoAuditResultsEmptyState description="…" />.
 */

import { History, SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface PresetProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function NoActivityEmptyState({
  title = "No activity yet",
  description = "Once people start working in this organization, their activity will show up here.",
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

export function NoAuditResultsEmptyState({
  title = "No events match your filters",
  description = "Try widening the date range, clearing the search, or switching organizations.",
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

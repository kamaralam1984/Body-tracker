/**
 * Team-management empty states, following `@/components/ui/empty-state-presets.tsx`'s
 * pattern (named presets wrapping the shared `EmptyState`). Kept in this
 * separate file — rather than extending `empty-state-presets.tsx` directly —
 * to avoid collisions with other concurrent Phase-10 agents also adding
 * entity-specific presets.
 */

import { SearchX, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface PresetProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function NoTeamsEmptyState({
  title = "No teams yet",
  description = "Create your first team to organize members.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={UsersRound}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoTeamResultsEmptyState({
  title = "No teams match your filters",
  description = "Try adjusting your search or date range.",
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

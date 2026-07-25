/**
 * Organization-specific EmptyState presets, following
 * `@/components/ui/empty-state-presets.tsx`'s pattern. Named
 * `organization-empty-states.tsx` (not `admin-empty-states.tsx`) because a
 * concurrent agent owns that path for user-related presets — see
 * AGENTS.md's Organization Management build brief.
 *
 * <NoOrganizationsEmptyState action={<Button onClick={...}>Create organization</Button>} />
 * <NoOrganizationResultsEmptyState />
 */

import { Building2, SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface PresetProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function NoOrganizationsEmptyState({
  title = "No organizations yet",
  description = "Create your first organization to get started.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={Building2}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoOrganizationResultsEmptyState({
  title = "No organizations match your filters",
  description = "Try adjusting your search or filters.",
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

/**
 * User Management empty-state presets — follows the same overridable-preset
 * pattern as `@/components/ui/empty-state-presets.tsx`, scoped to the admin
 * User Management page. Other admin pages (organizations, teams, API keys,
 * etc.) add their own presets to their own files.
 *
 * <NoUsersEmptyState action={<Button onClick={...}>Invite user</Button>} />
 * <NoResultsEmptyState />
 */

import { SearchX, Users } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";

interface PresetProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function NoUsersEmptyState({
  title = "No users yet",
  description = "Invite your first team member to get started.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={Users}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoResultsEmptyState({
  title = "No users match your filters",
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

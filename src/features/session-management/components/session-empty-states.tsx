/**
 * Named EmptyState presets for the session management module — follows
 * `src/components/ui/empty-state-presets.tsx`'s exact pattern (thin wrappers
 * around `EmptyState`, every field overridable via props).
 *
 * <NoSessionsEmptyState action={<Button>Start live session</Button>} />
 */

import { Archive, Radio, SearchX, Video } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface PresetProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function NoSessionsEmptyState({
  title = "No sessions yet",
  description = "Start a live session to begin building your library.",
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

export function NoSearchResultsEmptyState({
  title = "No sessions match your search",
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

export function NoLiveSessionsEmptyState({
  title = "No live sessions right now",
  description = "Sessions you start will appear here in real time.",
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

export function NoArchivedSessionsEmptyState({
  title = "Nothing archived yet",
  description = "Archived sessions will show up here.",
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

"use client";

/**
 * A single session tile for the card-grid view — premium media-card treatment
 * (Dropbox/Loom quality), not a raw table row. There's no real recorded
 * footage in this app, so the thumbnail is an honest, elegant placeholder: a
 * soft gradient with the session's dominant activity rendered as a subtle
 * center icon — never a fake video frame.
 *
 * <SessionGrid> renders one of these per `SessionRecord`.
 */

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Armchair, CircleDashed, Footprints, PersonStanding, Star, Wind } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useSessionManagementStore } from "../store/session-management-store";
import { formatClockTime, formatRelativeDate } from "../lib/session-format";
import type { ActivityType, SessionRecord } from "../types";
import { SessionStatusBadge } from "./session-status-badge";

const ACTIVITY_ICON: Record<ActivityType, LucideIcon> = {
  standing: PersonStanding,
  walking: Footprints,
  running: Wind,
  sitting: Armchair,
  idle: CircleDashed,
};

const EASE = [0.16, 1, 0.3, 1] as const;

export function SessionCard({
  session,
  className,
}: {
  session: SessionRecord;
  className?: string;
}) {
  const isSelected = useSessionManagementStore((state) => state.selectedIds.has(session.id));
  const isStarredInStore = useSessionManagementStore((state) => state.starredIds.has(session.id));
  const isStarred = session.starred || isStarredInStore;
  const toggleSelected = useSessionManagementStore((state) => state.toggleSelected);
  const toggleStarred = useSessionManagementStore((state) => state.toggleStarred);
  const openDetails = useSessionManagementStore((state) => state.openDetails);

  const ActivityIcon = ACTIVITY_ICON[session.activity];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: EASE }}
      className={cn("group", className)}
    >
      <Card
        interactive
        selected={isSelected}
        onClick={() => openDetails(session.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openDetails(session.id);
          }
        }}
        className="flex flex-col overflow-hidden p-0 transition-shadow duration-200 hover:shadow-md"
      >
        {/* Thumbnail placeholder */}
        <div className="from-muted to-muted/60 relative aspect-video w-full overflow-hidden bg-gradient-to-br">
          <div className="absolute inset-0 flex items-center justify-center">
            <ActivityIcon className="text-muted-foreground/40 size-10" strokeWidth={1.5} />
          </div>

          {/* Selection checkbox — visible on hover or when already selected */}
          <div
            className={cn(
              "absolute top-2.5 left-2.5 transition-opacity duration-150",
              isSelected
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
            )}
          >
            <span
              className="bg-surface/90 flex size-6 items-center justify-center rounded-md shadow-xs backdrop-blur-sm"
              onClick={(event) => event.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onChange={() => toggleSelected(session.id)}
                aria-label={isSelected ? "Deselect session" : "Select session"}
              />
            </span>
          </div>

          {/* Star / favorite toggle */}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleStarred(session.id);
            }}
            aria-label={isStarred ? "Remove from starred" : "Add to starred"}
            aria-pressed={isStarred}
            className="bg-surface/90 hover:bg-surface absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-md shadow-xs backdrop-blur-sm transition-colors duration-150"
          >
            <Star
              className={cn(
                "size-3.5 transition-colors duration-150",
                isStarred ? "fill-warning-500 text-warning-500" : "text-muted-foreground",
              )}
              strokeWidth={2}
            />
          </button>

          {/* Status badge */}
          <div className="absolute bottom-2.5 left-2.5">
            <SessionStatusBadge
              status={session.status}
              className="bg-surface-elevated/90 backdrop-blur-sm"
            />
          </div>

          {/* Duration pill */}
          <div className="bg-surface-elevated/90 text-foreground absolute right-2.5 bottom-2.5 rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
            {formatClockTime(session.durationSeconds)}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 p-4">
          <p className="text-foreground truncate text-sm font-semibold" title={session.name}>
            {session.name}
          </p>

          <div className="flex items-center gap-2">
            <Avatar src={session.user.avatarSrc} fallback={session.user.name} size="sm" />
            <div className="flex min-w-0 flex-col">
              <span className="text-foreground truncate text-xs font-medium">
                {session.user.name}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatRelativeDate(session.createdAt)}
              </span>
            </div>
          </div>

          {session.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {session.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

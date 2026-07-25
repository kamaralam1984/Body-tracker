"use client";

/**
 * Vertical activity feed for the Activity tab — reuses the existing
 * `Timeline`/`TimelineItem` primitives (`src/components/ui/timeline.tsx`),
 * it does not implement its own timeline rendering.
 *
 * Filtering (org scope, date range, search, activity/audit category via
 * `filters.status`) happens upstream via `filterActivityEvents` — this
 * component only renders whatever `events` it's given.
 */

import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "../lib/admin-format";
import { ACTIVITY_EVENT_ICON, ACTIVITY_EVENT_VARIANT } from "./activity-event-icon";
import type { ActivityEvent } from "../types";

/**
 * A real activity feed can easily have hundreds of events for a busy
 * organization. Rendering an unbounded list of Timeline nodes (each with its
 * own framer-motion reveal + connecting line) would be a genuine
 * scroll/performance problem, and a raw "infinite" timeline isn't how any
 * production audit UI (GitHub, Stripe, Vercel) actually behaves — they all
 * paginate or cap. We deliberately cap the rendered list here rather than
 * silently truncating: when there's more than `MAX_RENDERED` events we show
 * an explicit note telling the viewer to narrow their filters. This is NOT a
 * substitute for real pagination — it's a guardrail for this page's current
 * scope, which only ever receives an already-filtered event list.
 */
const MAX_RENDERED = 40;

export interface ActivityTimelineFeedProps {
  events: ActivityEvent[];
  className?: string;
}

export function ActivityTimelineFeed({ events, className }: ActivityTimelineFeedProps) {
  const visible = events.slice(0, MAX_RENDERED);
  const truncated = events.length > MAX_RENDERED;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <Timeline>
        {visible.map((event) => {
          const Icon = ACTIVITY_EVENT_ICON[event.type];
          return (
            <TimelineItem
              key={event.id}
              icon={<Icon />}
              variant={ACTIVITY_EVENT_VARIANT[event.type]}
              title={event.description}
              description={`${event.actor.name} · ${event.target}`}
              timestamp={formatRelativeDate(event.timestamp)}
            />
          );
        })}
      </Timeline>

      {truncated && (
        <p className="text-muted-foreground text-center text-xs">
          Showing latest {MAX_RENDERED} of {events.length} events — narrow your filters to see more.
        </p>
      )}
    </div>
  );
}

export function ActivityTimelineSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      ))}
    </div>
  );
}

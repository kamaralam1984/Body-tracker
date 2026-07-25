"use client";

/**
 * Vertical feed of `ActivityTimelineEvent`s for the activity-intelligence
 * module — reuses the existing `Timeline`/`TimelineItem` primitive from
 * `@/components/ui/timeline` (do not rebuild it here), mapping each
 * `ActivityTimelineEventType` to an icon + semantic variant the same way
 * `session-details-drawer.tsx` maps `SessionTimelineEventType`.
 *
 * <ActivityTimelineFeed events={timelineQuery.data ?? []} />
 */

import type { ReactNode } from "react";
import {
  Eye,
  Footprints,
  Hand,
  PersonStanding,
  PlayCircle,
  RefreshCcw,
  Smile,
  StopCircle,
  Waves,
  Wind,
} from "lucide-react";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "../lib/activity-format";
import type { ActivityTimelineEvent, ActivityTimelineEventType } from "../types";

type TimelineVariant = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const TIMELINE_EVENT_META: Record<
  ActivityTimelineEventType,
  { icon: ReactNode; variant: TimelineVariant }
> = {
  "activity-started": { icon: <PlayCircle />, variant: "accent" },
  "activity-changed": { icon: <RefreshCcw />, variant: "info" },
  "walking-started": { icon: <Footprints />, variant: "accent" },
  "standing-started": { icon: <PersonStanding />, variant: "accent" },
  "running-started": { icon: <Wind />, variant: "accent" },
  "smile-detected": { icon: <Smile />, variant: "success" },
  "blink-detected": { icon: <Eye />, variant: "info" },
  "hand-raised": { icon: <Hand />, variant: "success" },
  "wave-detected": { icon: <Waves />, variant: "success" },
  "activity-finished": { icon: <StopCircle />, variant: "neutral" },
};

export function ActivityTimelineFeed({
  events,
  className,
}: {
  events: ActivityTimelineEvent[];
  className?: string;
}) {
  if (events.length === 0) {
    return (
      <p className={cn("text-muted-foreground py-6 text-center text-sm", className)}>
        No activity events recorded yet.
      </p>
    );
  }

  return (
    <Timeline className={className}>
      {events.map((event) => {
        const meta = TIMELINE_EVENT_META[event.type];
        return (
          <TimelineItem
            key={event.id}
            icon={meta.icon}
            variant={meta.variant}
            title={event.label}
            description={event.description}
            timestamp={formatRelativeTime(event.timestamp)}
          />
        );
      })}
    </Timeline>
  );
}

export function ActivityTimelineSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-start gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5 pt-1">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

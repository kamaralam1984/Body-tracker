"use client";

/**
 * Cross-cutting behavior event feed — reuses the existing `Timeline`
 * primitive (same one used by session-management/activity-intelligence),
 * not a new timeline component.
 */

import {
  Coffee,
  Hand,
  PersonStanding,
  Smile,
  TrendingDown,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { formatRelativeTime } from "../lib/intelligence-format";
import type { BehaviorEventType, BehaviorTimelineEvent } from "../types";

const EVENT_ICON: Record<BehaviorEventType, LucideIcon> = {
  "mood-shift": Smile,
  "focus-peak": TrendingUp,
  "focus-dip": TrendingDown,
  "posture-alert": PersonStanding,
  "movement-burst": Zap,
  gesture: Hand,
  "break-taken": Coffee,
  "recommendation-followed": Smile,
};

const EVENT_VARIANT: Record<
  BehaviorEventType,
  "neutral" | "accent" | "success" | "warning" | "danger" | "info"
> = {
  "mood-shift": "info",
  "focus-peak": "success",
  "focus-dip": "warning",
  "posture-alert": "warning",
  "movement-burst": "accent",
  gesture: "accent",
  "break-taken": "neutral",
  "recommendation-followed": "success",
};

export function BehaviorTimelineFeed({
  events,
  className,
}: {
  events: BehaviorTimelineEvent[];
  className?: string;
}) {
  const capped = events.slice(0, 30);
  return (
    <div className={className}>
      <Timeline>
        {capped.map((event) => {
          const Icon = EVENT_ICON[event.type];
          return (
            <TimelineItem
              key={event.id}
              icon={<Icon />}
              variant={EVENT_VARIANT[event.type]}
              title={event.label}
              description={event.description}
              timestamp={formatRelativeTime(event.timestamp)}
            />
          );
        })}
      </Timeline>
      {events.length > 30 && (
        <p className="text-muted-foreground mt-3 text-xs">
          Showing the latest 30 of {events.length} events.
        </p>
      )}
    </div>
  );
}

"use client";

/**
 * Live activity feed for the current session — reads `timeline` from
 * `useSessionStore` and renders it through the existing `Timeline`/`TimelineItem`
 * primitives. Never surfaces raw technical/debug info (landmark counts,
 * confidence scores, etc.) — only human-readable event labels.
 */

import { useState } from "react";
import {
  Hand,
  PauseCircle,
  PlayCircle,
  Radio,
  ScanFace,
  StopCircle,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Timeline, TimelineItem, type TimelineItemProps } from "@/components/ui/timeline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSessionStore } from "../store/session-store";
import type { TimelineEventType } from "../types";

const VISIBLE_COUNT = 15;

const EVENT_META: Record<
  TimelineEventType,
  { icon: LucideIcon; variant: TimelineItemProps["variant"] }
> = {
  "session-started": { icon: PlayCircle, variant: "accent" },
  "tracking-started": { icon: Video, variant: "accent" },
  "tracking-paused": { icon: PauseCircle, variant: "warning" },
  "tracking-resumed": { icon: PlayCircle, variant: "accent" },
  "face-found": { icon: ScanFace, variant: "success" },
  "face-lost": { icon: ScanFace, variant: "neutral" },
  "hand-found": { icon: Hand, variant: "success" },
  "hand-lost": { icon: Hand, variant: "neutral" },
  "session-ended": { icon: StopCircle, variant: "neutral" },
};

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export interface LiveTimelineProps {
  className?: string;
}

export function LiveTimeline({ className }: LiveTimelineProps) {
  const timeline = useSessionStore((s) => s.timeline);
  const [expanded, setExpanded] = useState(false);

  if (timeline.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
          className,
        )}
      >
        <div className="bg-muted flex size-10 items-center justify-center rounded-full">
          <Radio className="text-muted-foreground size-4" strokeWidth={1.75} />
        </div>
        <p className="text-muted-foreground text-sm">
          No activity yet — start tracking to see live events here
        </p>
      </div>
    );
  }

  const visibleEvents = expanded ? timeline : timeline.slice(0, VISIBLE_COUNT);
  const hasMore = timeline.length > VISIBLE_COUNT;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <Timeline>
        {visibleEvents.map((event) => {
          const meta = EVENT_META[event.type];
          const Icon = meta.icon;
          return (
            <TimelineItem
              key={event.id}
              icon={<Icon />}
              variant={meta.variant}
              title={event.label}
              description={event.description}
              timestamp={formatTimestamp(event.timestamp)}
            />
          );
        })}
      </Timeline>

      {hasMore && !expanded && (
        <Button
          variant="outline"
          size="sm"
          className="self-center"
          onClick={() => setExpanded(true)}
        >
          Show more
        </Button>
      )}
    </div>
  );
}

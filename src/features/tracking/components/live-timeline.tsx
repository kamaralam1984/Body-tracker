"use client";

/**
 * Live activity feed for the current camera session — gestures,
 * distraction/drowsiness events, exercise starts/completions — reusing the
 * generic `Timeline`/`TimelineItem` primitive. Reads
 * `useTrackingContext().live.timeline` (see `use-tracking-session-sync.ts`),
 * newest first, capped at the last 20 entries.
 *
 * <LiveTimeline />
 */

import {
  Hand,
  Dumbbell,
  Eye,
  EyeOff,
  Smile,
  CircleAlert,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timeline, TimelineItem, type TimelineItemProps } from "@/components/ui/timeline";
import { cn } from "@/lib/utils";
import { useTrackingContext } from "../context/tracking-provider";

function iconAndVariantFor(label: string): {
  icon: LucideIcon;
  variant: TimelineItemProps["variant"];
} {
  if (label === "Session started") return { icon: PlayCircle, variant: "accent" };
  if (label === "Exercise started") return { icon: Dumbbell, variant: "info" };
  if (label.startsWith("Rep completed")) return { icon: Dumbbell, variant: "success" };
  if (label === "Left the frame") return { icon: EyeOff, variant: "warning" };
  if (label === "Looked away") return { icon: Eye, variant: "warning" };
  if (label.startsWith("Eyes closed")) return { icon: CircleAlert, variant: "danger" };
  if (label === "Smile") return { icon: Smile, variant: "success" };
  return { icon: Hand, variant: "neutral" };
}

function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function LiveTimeline({ className }: { className?: string }) {
  const { live } = useTrackingContext();

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Live timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {live.timeline.length === 0 ? (
          <p className="text-muted-foreground text-sm">No activity yet this session.</p>
        ) : (
          <Timeline>
            {live.timeline.map((entry) => {
              const { icon: Icon, variant } = iconAndVariantFor(entry.label);
              return (
                <TimelineItem
                  key={entry.id}
                  icon={<Icon />}
                  variant={variant}
                  title={entry.label}
                  timestamp={formatClockTime(entry.time)}
                />
              );
            })}
          </Timeline>
        )}
      </CardContent>
    </Card>
  );
}

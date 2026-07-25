"use client";

/**
 * Premium activity card — Apple-Health-widget quality, not a raw data row.
 * Icon tile + label up top, status/confidence badges, a few key/value
 * rows (started, duration, last updated), and a trend indicator.
 *
 * <ActivityCard activity={activity} />
 */

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  activityLabel,
  formatDurationLabel,
  formatRelativeTime,
  formatTimeOnly,
} from "../lib/activity-format";
import type { LiveActivityCard } from "../types";
import { ActivityIcon } from "./activity-icon";
import {
  ActivityConfidenceBadge,
  ActivityStatusBadge,
  TrendIndicator,
} from "./activity-status-badge";

export function ActivityCard({
  activity,
  className,
}: {
  activity: LiveActivityCard;
  className?: string;
}) {
  const isActive = activity.status === "active";
  const isUnavailable = activity.status === "unavailable";

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15, ease: "easeOut" }}>
      <Card
        className={cn(
          "flex flex-col gap-4 p-5",
          isActive && "ring-accent/40 ring-1",
          isUnavailable && "opacity-60",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                isActive ? "bg-accent-100 dark:bg-accent-900" : "bg-muted",
              )}
            >
              <ActivityIcon
                kind={activity.kind}
                className={cn(
                  "size-5",
                  isActive ? "text-accent-700 dark:text-accent-200" : "text-muted-foreground",
                )}
              />
            </div>
            <p className="text-foreground text-sm font-semibold tracking-tight">
              {activityLabel(activity.kind)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ActivityStatusBadge status={activity.status} />
          <ActivityConfidenceBadge confidence={activity.confidence} />
        </div>

        <div className="border-border-subtle flex flex-col gap-2 border-t pt-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Started</span>
            <span className="text-foreground font-medium">
              {activity.startedAt ? formatTimeOnly(activity.startedAt) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span className="text-foreground font-medium">
              {formatDurationLabel(activity.durationSeconds)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Last updated</span>
            <span className="text-foreground font-medium">
              {formatRelativeTime(activity.lastUpdated)}
            </span>
          </div>
        </div>

        <TrendIndicator
          trend={activity.trend}
          label={activity.trendLabel}
          className="border-border-subtle border-t pt-3"
        />
      </Card>
    </motion.div>
  );
}

"use client";

/**
 * Responsive grid of `ActivityCard`s with a staggered entrance (capped at
 * 8 items so a full grid doesn't cascade for seconds), plus a matching
 * skeleton grid for the loading state.
 *
 * <ActivityGrid activities={data} />
 * <ActivityGridSkeleton />
 */

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LiveActivityCard } from "../types";
import { ActivityCard } from "./activity-card";

const MAX_STAGGER_ITEMS = 8;
const GRID_CLASS = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export function ActivityGrid({
  activities,
  className,
}: {
  activities: LiveActivityCard[];
  className?: string;
}) {
  return (
    <div className={cn(GRID_CLASS, className)}>
      {activities.map((activity, index) => (
        <motion.div
          key={`${activity.kind}-${index}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.25,
            delay: Math.min(index, MAX_STAGGER_ITEMS) * 0.04,
            ease: "easeOut",
          }}
        >
          <ActivityCard activity={activity} />
        </motion.div>
      ))}
    </div>
  );
}

function ActivityCardSkeleton() {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="border-border-subtle flex flex-col gap-2 border-t pt-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </Card>
  );
}

export function ActivityGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: count }).map((_, index) => (
        <ActivityCardSkeleton key={index} />
      ))}
    </div>
  );
}

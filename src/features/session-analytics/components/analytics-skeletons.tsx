"use client";

/**
 * Small, composable skeleton placeholders for the analytics dashboard.
 * `KpiCardSkeleton` mirrors `LoadingCard` (see `card-variants.tsx`) shaped
 * like a `StatTile`/`MetricCard`. `TimelineSkeleton` mimics `TimelineItem`'s
 * layout (marker + title/description lines). Drop these in wherever real
 * data isn't ready yet.
 */

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface KpiCardSkeletonProps {
  className?: string;
}

/** Skeleton placeholder shaped like a KPI stat card — icon block + label + value lines. */
export function KpiCardSkeleton({ className }: KpiCardSkeletonProps) {
  return (
    <Card className={cn("flex items-center gap-4 p-5", className)}>
      <Skeleton className="size-10 shrink-0 rounded-md" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
    </Card>
  );
}

export interface TimelineSkeletonProps {
  rows?: number;
  className?: string;
}

/** Skeleton placeholder mimicking a handful of `TimelineItem` rows. */
export function TimelineSkeleton({ rows = 4, className }: TimelineSkeletonProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex gap-3 pb-6 last:pb-0">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

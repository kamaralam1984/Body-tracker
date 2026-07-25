"use client";

/**
 * Responsive card-grid view of sessions, with a staggered entrance.
 *
 * <SessionGrid sessions={data} />
 * <SessionGridSkeleton /> — loading placeholder, same grid shape
 */

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { SessionRecord } from "../types";
import { SessionCard } from "./session-card";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Cap the stagger so a large grid doesn't produce a multi-second cascade. */
const MAX_STAGGER_ITEMS = 8;
const STAGGER_STEP = 0.04;

const GRID_CLASS = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

export function SessionGrid({
  sessions,
  className,
}: {
  sessions: SessionRecord[];
  className?: string;
}) {
  return (
    <div className={cn(GRID_CLASS, className)}>
      {sessions.map((session, index) => (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.35,
            ease: EASE,
            delay: Math.min(index, MAX_STAGGER_ITEMS) * STAGGER_STEP,
          }}
        >
          <SessionCard session={session} />
        </motion.div>
      ))}
    </div>
  );
}

/** Skeleton placeholder mirroring `LoadingCard`'s technique, shaped like a `SessionCard`. */
export function SessionGridSkeleton({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn(GRID_CLASS, className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="flex flex-col overflow-hidden p-0">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center gap-2">
              <Skeleton className="size-7 rounded-full" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

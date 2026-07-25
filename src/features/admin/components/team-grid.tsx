"use client";

/**
 * Responsive card-grid view of teams, with a staggered entrance — mirrors
 * `session-management/components/session-grid.tsx`. Purely presentational:
 * filtering/scoping happens upstream (the page calls `filterTeams` plus the
 * org-switcher scope before passing `teams` in), this component just renders.
 *
 * <TeamGrid teams={data} />
 * <TeamGridSkeleton /> — loading placeholder, same grid shape
 */

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Team } from "../types";
import { TeamCard } from "./team-card";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Cap the stagger so a large grid doesn't produce a multi-second cascade. */
const MAX_STAGGER_ITEMS = 8;
const STAGGER_STEP = 0.04;

const GRID_CLASS = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

export function TeamGrid({ teams, className }: { teams: Team[]; className?: string }) {
  return (
    <div className={cn(GRID_CLASS, className)}>
      {teams.map((team, index) => (
        <motion.div
          key={team.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.35,
            ease: EASE,
            delay: Math.min(index, MAX_STAGGER_ITEMS) * STAGGER_STEP,
          }}
        >
          <TeamCard team={team} />
        </motion.div>
      ))}
    </div>
  );
}

/** Skeleton placeholder mirroring `SessionGridSkeleton`'s technique, shaped like a `TeamCard`. */
export function TeamGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn(GRID_CLASS, className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="flex flex-col gap-4 p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-11 shrink-0 rounded-lg" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex -space-x-2.5">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="size-7 rounded-full" />
          </div>
          <Skeleton className="h-3 w-40" />
          <div className="border-border-subtle flex items-center justify-between border-t pt-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
}

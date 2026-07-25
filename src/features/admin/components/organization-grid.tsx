"use client";

/**
 * Responsive card-grid view of organizations, with a staggered entrance.
 * Mirrors `session-management/components/session-grid.tsx`'s technique.
 *
 * <OrganizationGrid organizations={data} />
 * <OrganizationGridSkeleton /> — loading placeholder, same grid shape
 */

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Organization } from "../types";
import { OrganizationCard } from "./organization-card";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Cap the stagger so a large grid doesn't produce a multi-second cascade. */
const MAX_STAGGER_ITEMS = 8;
const STAGGER_STEP = 0.04;

const GRID_CLASS = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

export function OrganizationGrid({
  organizations,
  className,
}: {
  organizations: Organization[];
  className?: string;
}) {
  return (
    <div className={cn(GRID_CLASS, className)}>
      {organizations.map((organization, index) => (
        <motion.div
          key={organization.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.35,
            ease: EASE,
            delay: Math.min(index, MAX_STAGGER_ITEMS) * STAGGER_STEP,
          }}
        >
          <OrganizationCard organization={organization} />
        </motion.div>
      ))}
    </div>
  );
}

/** Skeleton placeholder mirroring `SessionGridSkeleton`'s technique, shaped like an `OrganizationCard`. */
export function OrganizationGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn(GRID_CLASS, className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
        </Card>
      ))}
    </div>
  );
}

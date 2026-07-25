"use client";

/**
 * Responsive grid of `ReportCard`s with staggered entrance, plus a matching
 * skeleton grid for the loading state.
 *
 * <ReportGrid reports={data} />
 * <ReportGridSkeleton count={8} />
 */

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ReportRecord } from "../types";
import { ReportCard } from "./report-card";

const EASE = [0.16, 1, 0.3, 1] as const;
const STAGGER_CAP = 8;

export function ReportGrid({
  reports,
  className,
}: {
  reports: ReportRecord[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
        className,
      )}
    >
      {reports.map((report, index) => (
        <motion.div
          key={report.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.25,
            ease: EASE,
            delay: Math.min(index, STAGGER_CAP) * 0.04,
          }}
        >
          <ReportCard report={report} />
        </motion.div>
      ))}
    </div>
  );
}

function ReportCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="size-10 rounded-lg" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="border-border-subtle mt-1 flex items-center justify-between gap-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-14" />
      </div>
    </Card>
  );
}

export function ReportGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ReportCardSkeleton key={i} />
      ))}
    </div>
  );
}

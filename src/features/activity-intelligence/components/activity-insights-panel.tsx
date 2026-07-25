"use client";

/**
 * Insights panel for Activity Intelligence — reuses the reporting feature's
 * `InsightCard` directly (same `Insight` shape/tone rules) rather than
 * rebuilding it, mirroring the layout convention from
 * `@/features/reporting/components/insights-panel.tsx`.
 */

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { InsightCard } from "@/features/reporting";
import type { Insight } from "../types";

export interface ActivityInsightsPanelProps {
  insights: Insight[];
  className?: string;
}

export function ActivityInsightsPanel({ insights, className }: ActivityInsightsPanelProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <h2 className="text-foreground text-base font-semibold tracking-tight">Insights</h2>
      {insights.length === 0 ? (
        <p className="text-muted-foreground text-sm">Not enough activity yet for insights.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
            >
              <InsightCard insight={insight} className="h-full" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ActivityInsightsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <Skeleton className="h-5 w-20" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="flex items-start gap-3 p-5">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

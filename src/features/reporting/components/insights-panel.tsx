"use client";

/** Responsive grid of `InsightCard`s with staggered entrance, plus an empty state. */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Insight } from "../types";
import { InsightCard } from "./insight-card";

export interface InsightsPanelProps {
  insights: Insight[];
  className?: string;
  emptyMessage?: string;
}

export function InsightsPanel({
  insights,
  className,
  emptyMessage = "No notable changes this period.",
}: InsightsPanelProps) {
  if (insights.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3", className)}>
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
  );
}

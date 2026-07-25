"use client";

/**
 * Executive Summary header — a hero performance score paired with a grid of
 * KPI trend cards. Renders whatever `ExecutiveSummaryData` it's given; all
 * computation (score, comparisons) happens upstream via
 * `computePerformanceScore` / `generateComparisonInsights` and friends.
 */

import { motion } from "framer-motion";
import { CircularProgress } from "@/components/ui/circular-progress";
import { TrendCard } from "@/components/ui/card-variants";
import { formatComparisonValue, formatChangeLabel } from "../lib/comparison";
import type { ExecutiveSummaryData } from "../types";
import { cn } from "@/lib/utils";

export interface ExecutiveSummaryProps {
  data: ExecutiveSummaryData;
  className?: string;
}

function scoreVariant(score: number): "success" | "warning" | "danger" {
  if (score >= 75) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

export function ExecutiveSummary({ data, className }: ExecutiveSummaryProps) {
  const { performanceScore, kpis } = data;

  return (
    <div className={cn("flex flex-col gap-6 lg:flex-row lg:items-stretch", className)}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="border-border bg-surface flex shrink-0 flex-col items-center justify-center gap-3 rounded-xl border p-6 lg:w-64"
      >
        <div className="relative inline-flex items-center justify-center">
          <CircularProgress
            value={performanceScore}
            max={100}
            size={140}
            strokeWidth={10}
            variant={scoreVariant(performanceScore)}
          />
          <span className="text-foreground pointer-events-none absolute text-4xl font-semibold tracking-tight tabular-nums">
            {Math.round(performanceScore)}
          </span>
        </div>
        <p className="text-muted-foreground text-sm font-medium">Performance score</p>
      </motion.div>

      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
          >
            <TrendCard
              label={kpi.label}
              value={formatComparisonValue(kpi.current, kpi.unit)}
              direction={kpi.direction}
              changeLabel={formatChangeLabel(kpi)}
              className="h-full"
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

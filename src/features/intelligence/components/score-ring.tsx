"use client";

/**
 * The intelligence dashboard's signature visual — a labeled score ring
 * (Whoop/Oura style) built on the existing `CircularProgress` primitive
 * rather than a new one. Used for the Overall Wellness hero and each pillar
 * score card. Never shows a raw confidence number — a 0-100 "score" is a
 * legitimate business metric (like a credit score or NPS), distinct from
 * exposing model confidence, which this app never does anywhere.
 */

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { CircularProgress } from "@/components/ui/circular-progress";
import { cn } from "@/lib/utils";
import type { TrendDirection } from "../types";

function scoreVariant(score: number): "success" | "warning" | "danger" {
  if (score >= 70) return "success";
  if (score >= 45) return "warning";
  return "danger";
}

export function TrendBadge({
  trend,
  delta,
  className,
}: {
  trend: TrendDirection;
  delta?: number;
  className?: string;
}) {
  const Icon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;
  const colorClass =
    trend === "improving"
      ? "text-success-600 dark:text-success-500"
      : trend === "declining"
        ? "text-danger-600 dark:text-danger-500"
        : "text-muted-foreground";
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs font-medium", colorClass, className)}
    >
      <Icon className="size-3.5" strokeWidth={2.25} />
      {trend === "stable"
        ? "Stable"
        : `${delta !== undefined ? `${delta > 0 ? "+" : ""}${delta} ` : ""}${trend === "improving" ? "Improving" : "Declining"}`}
    </span>
  );
}

export interface ScoreRingProps {
  label: string;
  score: number;
  size?: number;
  strokeWidth?: number;
  trend?: TrendDirection;
  trendDelta?: number;
  description?: string;
  className?: string;
}

export function ScoreRing({
  label,
  score,
  size = 96,
  strokeWidth = 8,
  trend,
  trendDelta,
  description,
  className,
}: ScoreRingProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 text-center", className)}>
      <div className="relative inline-flex items-center justify-center">
        <CircularProgress
          value={score}
          size={size}
          strokeWidth={strokeWidth}
          variant={scoreVariant(score)}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-foreground text-xl font-semibold tabular-nums">{score}</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-foreground text-sm font-medium">{label}</span>
        {trend && <TrendBadge trend={trend} delta={trendDelta} />}
        {description && (
          <p className="text-muted-foreground max-w-[16rem] text-xs">{description}</p>
        )}
      </div>
    </div>
  );
}

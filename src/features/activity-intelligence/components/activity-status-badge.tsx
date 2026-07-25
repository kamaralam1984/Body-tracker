"use client";

/**
 * Static badges for a live activity card's detection `status` and
 * `confidence`, plus a small inline `TrendIndicator`. Mirrors
 * `SessionStatusBadge`/`SessionQualityBadge`'s technique exactly: a
 * Badge + optional pulsing dot for transitional/in-progress states.
 *
 * <ActivityStatusBadge status={activity.status} />
 * <ActivityConfidenceBadge confidence={activity.confidence} />
 * <TrendIndicator trend={activity.trend} label={activity.trendLabel} />
 */

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { badgeVariants, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActivityDetectionState, ConfidenceLevel, TrendDirection } from "../types";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

interface StatusMeta {
  variant: BadgeVariant;
  label: string;
  /** Subtle pulsing opacity loop on the status dot, for transitional/in-progress states. */
  pulse?: boolean;
  /** Muted/reduced-opacity treatment, for states where tracking has stopped entirely. */
  muted?: boolean;
}

const STATUS_META: Record<ActivityDetectionState, StatusMeta> = {
  active: { variant: "success", label: "Active", pulse: true },
  detected: { variant: "info", label: "Detected", pulse: true },
  searching: { variant: "warning", label: "Searching", pulse: true },
  completed: { variant: "neutral", label: "Completed" },
  paused: { variant: "warning", label: "Paused" },
  inactive: { variant: "neutral", label: "Inactive" },
  unavailable: { variant: "neutral", label: "Unavailable", muted: true },
};

const CONFIDENCE_META: Record<ConfidenceLevel, StatusMeta> = {
  excellent: { variant: "success", label: "Excellent" },
  good: { variant: "success", label: "Good" },
  moderate: { variant: "info", label: "Moderate" },
  limited: { variant: "warning", label: "Limited" },
  searching: { variant: "warning", label: "Searching", pulse: true },
  offline: { variant: "neutral", label: "Offline" },
};

const DOT_COLOR_CLASS: Record<BadgeVariant, string> = {
  neutral: "bg-muted-foreground",
  accent: "bg-accent-600 dark:bg-accent-300",
  success: "bg-success-600 dark:bg-success-500",
  warning: "bg-warning-600 dark:bg-warning-500",
  danger: "bg-danger-600 dark:bg-danger-500",
  info: "bg-info-600 dark:bg-info-500",
  outline: "bg-foreground",
};

function StatusPill({ meta, className }: { meta: StatusMeta; className?: string }) {
  return (
    <span
      className={cn(
        badgeVariants({ variant: meta.variant }),
        "gap-1.5",
        meta.muted && "opacity-60",
        className,
      )}
    >
      <motion.span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", DOT_COLOR_CLASS[meta.variant])}
        animate={meta.pulse ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
        transition={
          meta.pulse ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.15 }
        }
      />
      {meta.label}
    </span>
  );
}

export function ActivityStatusBadge({
  status,
  className,
}: {
  status: ActivityDetectionState;
  className?: string;
}) {
  return <StatusPill meta={STATUS_META[status]} className={className} />;
}

export function ActivityConfidenceBadge({
  confidence,
  className,
}: {
  confidence: ConfidenceLevel;
  className?: string;
}) {
  return <StatusPill meta={CONFIDENCE_META[confidence]} className={className} />;
}

const TREND_META: Record<TrendDirection, { icon: typeof TrendingUp; tone: string }> = {
  up: { icon: TrendingUp, tone: "text-success-600 dark:text-success-500" },
  down: { icon: TrendingDown, tone: "text-danger-600 dark:text-danger-500" },
  flat: { icon: Minus, tone: "text-muted-foreground" },
};

export function TrendIndicator({
  trend,
  label,
  className,
}: {
  trend: TrendDirection;
  label?: string;
  className?: string;
}) {
  const meta = TREND_META[trend];
  const Icon = meta.icon;
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs font-medium", meta.tone, className)}
    >
      <Icon className="size-3.5" strokeWidth={2.25} />
      {label && <span>{label}</span>}
    </span>
  );
}

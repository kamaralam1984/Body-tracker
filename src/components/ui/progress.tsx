"use client";

/**
 * Linear progress bar.
 *
 * Usage:
 *   <Progress value={72} showValue />
 *   <Progress value={40} size="lg" variant="success" />
 *   <Progress indeterminate size="sm" />
 *
 * `value` is clamped to [0, max]. When `indeterminate`, a sweeping fill
 * loops continuously and `aria-valuenow` is omitted per WAI-ARIA guidance.
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "h-1",
  md: "h-1.5",
  lg: "h-2",
} as const;

const variantMap = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
} as const;

export interface ProgressProps {
  value?: number;
  max?: number;
  size?: keyof typeof sizeMap;
  variant?: keyof typeof variantMap;
  showValue?: boolean;
  indeterminate?: boolean;
  className?: string;
}

export function Progress({
  value = 0,
  max = 100,
  size = "md",
  variant = "accent",
  showValue = false,
  indeterminate = false,
  className,
}: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? (clamped / max) * 100 : 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={indeterminate ? undefined : clamped}
        className={cn(
          "bg-muted relative w-full flex-1 overflow-hidden rounded-full",
          sizeMap[size],
        )}
      >
        {indeterminate ? (
          <motion.div
            className={cn("absolute inset-y-0 w-1/3 rounded-full", variantMap[variant])}
            animate={{ left: ["-33%", "100%"] }}
            transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity }}
          />
        ) : (
          <motion.div
            className={cn("h-full rounded-full", variantMap[variant])}
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </div>
      {showValue && !indeterminate && (
        <span className="text-muted-foreground w-9 shrink-0 text-right text-xs font-medium tabular-nums">
          {Math.round(percent)}%
        </span>
      )}
    </div>
  );
}

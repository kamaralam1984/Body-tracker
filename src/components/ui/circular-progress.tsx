"use client";

/**
 * Circular / ring progress indicator, built as an SVG.
 *
 * Usage:
 *   <CircularProgress value={72} size={56} showValue />
 *   <CircularProgress value={30} variant="warning" />
 *   <CircularProgress indeterminate size={24} strokeWidth={2.5} />
 *
 * Determinate mode animates `strokeDashoffset` with framer-motion; the
 * background ring uses `stroke-muted`. Indeterminate mode shows a
 * continuously rotating partial arc, similar in spirit to spinner.tsx.
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const variantMap = {
  accent: "stroke-accent",
  success: "stroke-success",
  warning: "stroke-warning",
  danger: "stroke-danger",
} as const;

export interface CircularProgressProps {
  value?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: keyof typeof variantMap;
  showValue?: boolean;
  indeterminate?: boolean;
  className?: string;
}

export function CircularProgress({
  value = 0,
  max = 100,
  size = 40,
  strokeWidth = 4,
  variant = "accent",
  showValue = false,
  indeterminate = false,
  className,
}: CircularProgressProps) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? (clamped / max) * 100 : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={indeterminate ? undefined : clamped}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn(indeterminate && "animate-spin")}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {indeterminate ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.75}
            className={variantMap[variant]}
          />
        ) : (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={false}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className={variantMap[variant]}
          />
        )}
      </svg>
      {showValue && !indeterminate && (
        <span className="text-foreground absolute text-xs font-medium tabular-nums">
          {Math.round(percent)}%
        </span>
      )}
    </div>
  );
}

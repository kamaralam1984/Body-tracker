"use client";

/**
 * Compact, glanceable tracking status indicator — a single Badge-styled pill
 * with a small status dot and a 1-2 word label, cross-fading between states.
 * Mirrors `src/features/camera/components/status-badge.tsx`'s exact
 * technique so the two badges read as one consistent family when placed
 * side by side (e.g. camera status + tracking status near the toolbar).
 *
 * Named `TrackingStatusBadge` (not `TrackingStatus`, which is the status
 * union type in `../types`).
 *
 * <TrackingStatusBadge />
 */

import { AnimatePresence, motion } from "framer-motion";
import { badgeVariants, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTrackingContext } from "../context/tracking-provider";
import type { TrackingStatus } from "../types";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

interface StatusMeta {
  variant: BadgeVariant;
  label: string;
  /** Subtle pulsing opacity loop on the status dot, for transitional states. */
  pulse?: boolean;
}

const STATUS_META: Record<TrackingStatus, StatusMeta> = {
  idle: { variant: "neutral", label: "Off" },
  initializing: { variant: "info", label: "Starting…", pulse: true },
  searching: { variant: "info", label: "Searching…", pulse: true },
  excellent: { variant: "success", label: "Excellent" },
  good: { variant: "success", label: "Good" },
  limited: { variant: "warning", label: "Limited" },
  lost: { variant: "neutral", label: "Lost" },
  reconnecting: { variant: "warning", label: "Reconnecting…", pulse: true },
  error: { variant: "danger", label: "Unavailable" },
  unsupported: { variant: "danger", label: "Unsupported" },
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

export function TrackingStatusBadge({ className }: { className?: string }) {
  const { status } = useTrackingContext();
  const meta = STATUS_META[status];

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={status}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={cn(badgeVariants({ variant: meta.variant }), "gap-1.5", className)}
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
      </motion.span>
    </AnimatePresence>
  );
}

"use client";

/**
 * Compact, glanceable status indicator — a single Badge-styled pill with a
 * small status dot and a 1-2 word label. Cross-fades between states so
 * status changes read as a smooth transition rather than a layout jump.
 *
 * For the fuller descriptive copy (title + description) shown when the
 * camera isn't actively running, see `camera-card.tsx`'s overlay instead —
 * this component is meant for persistent, low-profile placement (e.g. next
 * to a toolbar or inside `PerformancePanel`).
 *
 * <StatusBadge />
 */

import { AnimatePresence, motion } from "framer-motion";
import { badgeVariants, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";
import type { CameraStatus } from "../types";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

interface StatusMeta {
  variant: BadgeVariant;
  label: string;
  /** Subtle pulsing opacity loop on the status dot, for transitional states. */
  pulse?: boolean;
}

const STATUS_META: Record<CameraStatus, StatusMeta> = {
  idle: { variant: "neutral", label: "Offline" },
  initializing: { variant: "info", label: "Connecting…", pulse: true },
  waiting: { variant: "info", label: "Connecting…", pulse: true },
  ready: { variant: "info", label: "Connecting…", pulse: true },
  running: { variant: "success", label: "Live" },
  paused: { variant: "warning", label: "Paused" },
  stopped: { variant: "neutral", label: "Offline" },
  "permission-required": { variant: "warning", label: "Permission needed" },
  "permission-denied": { variant: "danger", label: "Access denied" },
  "device-not-found": { variant: "danger", label: "No camera" },
  "camera-busy": { variant: "danger", label: "Busy" },
  "camera-error": { variant: "danger", label: "Error" },
  reconnecting: { variant: "info", label: "Reconnecting…", pulse: true },
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

export function StatusBadge({ className }: { className?: string }) {
  const { status } = useCameraContext();
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

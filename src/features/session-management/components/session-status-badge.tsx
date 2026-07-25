"use client";

/**
 * Static (non-cross-fading) badges for a session's lifecycle `status` and
 * signal `quality`. Sessions in this library aren't live-updating streams
 * the way `TrackingStatusBadge` is, so no `AnimatePresence` cross-fade is
 * needed here — just a Badge + optional pulsing dot for transitional states.
 *
 * <SessionStatusBadge status={session.status} />
 * <SessionQualityBadge quality={session.quality} />
 */

import { motion } from "framer-motion";
import { badgeVariants, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QualityLevel, SessionStatus } from "../types";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

interface StatusMeta {
  variant: BadgeVariant;
  label: string;
  /** Subtle pulsing opacity loop on the status dot, for transitional/in-progress states. */
  pulse?: boolean;
}

const STATUS_META: Record<SessionStatus, StatusMeta> = {
  live: { variant: "success", label: "Live", pulse: true },
  recording: { variant: "danger", label: "Recording", pulse: true },
  paused: { variant: "warning", label: "Paused" },
  completed: { variant: "neutral", label: "Completed" },
  archived: { variant: "neutral", label: "Archived" },
  processing: { variant: "info", label: "Processing", pulse: true },
  uploading: { variant: "info", label: "Uploading", pulse: true },
  failed: { variant: "danger", label: "Failed" },
  deleted: { variant: "neutral", label: "Deleted" },
};

/** Mirrors `TrackingStatusBadge`'s excellent/good/limited/searching/offline → variant mapping. */
const QUALITY_META: Record<QualityLevel, StatusMeta> = {
  excellent: { variant: "success", label: "Excellent" },
  good: { variant: "success", label: "Good" },
  limited: { variant: "warning", label: "Limited" },
  searching: { variant: "info", label: "Searching…", pulse: true },
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
    <span className={cn(badgeVariants({ variant: meta.variant }), "gap-1.5", className)}>
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

export function SessionStatusBadge({
  status,
  className,
}: {
  status: SessionStatus;
  className?: string;
}) {
  return <StatusPill meta={STATUS_META[status]} className={className} />;
}

export function SessionQualityBadge({
  quality,
  className,
}: {
  quality: QualityLevel;
  className?: string;
}) {
  return <StatusPill meta={QUALITY_META[quality]} className={className} />;
}

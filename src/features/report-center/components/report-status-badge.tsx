"use client";

/**
 * Static status/template badges for a report record, mirroring
 * `session-status-badge.tsx`'s Badge + pulsing-dot technique for
 * transitional states.
 *
 * <ReportStatusBadge status={report.status} />
 * <ReportTemplateBadge template={report.template} />
 */

import { motion } from "framer-motion";
import { badgeVariants, Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { reportTemplateLabel } from "../lib/report-format";
import type { ReportRecordStatus, ReportTemplate } from "../types";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

interface StatusMeta {
  variant: BadgeVariant;
  label: string;
  /** Subtle pulsing opacity loop on the status dot, for transitional/in-progress states. */
  pulse?: boolean;
}

const STATUS_META: Record<ReportRecordStatus, StatusMeta> = {
  ready: { variant: "success", label: "Ready" },
  generating: { variant: "info", label: "Generating", pulse: true },
  scheduled: { variant: "warning", label: "Scheduled" },
  failed: { variant: "danger", label: "Failed" },
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

export function ReportStatusBadge({
  status,
  className,
}: {
  status: ReportRecordStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
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

export function ReportTemplateBadge({
  template,
  className,
}: {
  template: ReportTemplate;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={className}>
      {reportTemplateLabel(template)}
    </Badge>
  );
}

"use client";

import { Children, isValidElement, type ReactElement } from "react";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Vertical activity feed / audit log / history view.
 *
 * @example
 * <Timeline>
 *   <TimelineItem
 *     icon={<CircleCheck />}
 *     variant="success"
 *     title="Session completed"
 *     description="Sarah Chen finished a mobility assessment."
 *     timestamp="12m ago"
 *   />
 *   <TimelineItem title="Member joined" timestamp="1h ago" />
 * </Timeline>
 */

const markerVariants = cva(
  "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-background [&_svg]:size-4",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        accent: "bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-200",
        success: "bg-success-bg text-success-600 dark:text-success-500",
        warning: "bg-warning-bg text-warning-600 dark:text-warning-500",
        danger: "bg-danger-bg text-danger-600 dark:text-danger-500",
        info: "bg-info-bg text-info-600 dark:text-info-500",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/** Container for a list of `TimelineItem`s — renders the connecting line behind the nodes. */
export function Timeline({ className, children, ...props }: TimelineProps) {
  const items = Children.toArray(children).filter(isValidElement);

  return (
    <div className={cn("relative flex flex-col", className)} {...props}>
      {items.map((child, index) => (
        <motion.div
          key={(child as ReactElement).key ?? index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

export interface TimelineItemProps extends VariantProps<typeof markerVariants> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  timestamp?: string;
  className?: string;
}

/** A single node in a `Timeline`. Compose one or more inside `<Timeline>`. */
export function TimelineItem({
  icon,
  title,
  description,
  timestamp,
  variant,
  className,
}: TimelineItemProps) {
  return (
    <div className={cn("group relative flex gap-3 pb-6 last:pb-0", className)}>
      {/* connecting line — sits behind the marker, stops at the last item */}
      <div className="bg-border absolute top-0 left-4 h-full w-px -translate-x-1/2 group-last:hidden" />

      <div className={cn(markerVariants({ variant }))}>
        {icon ?? <span className="size-1.5 rounded-full bg-current" />}
      </div>

      <div className="flex flex-1 flex-col gap-0.5 pt-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-foreground text-sm font-medium">{title}</p>
          {timestamp && <span className="text-muted-foreground shrink-0 text-xs">{timestamp}</span>}
        </div>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
    </div>
  );
}

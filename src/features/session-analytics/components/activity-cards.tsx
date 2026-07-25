"use client";

/**
 * Presentational "which of these 5 activity states are we in right now"
 * strip. Reuses the `layoutId` shared-element technique from
 * `src/components/ui/tabs.tsx`'s active-tab indicator so the accent
 * highlight slides smoothly between cards as `currentActivity` changes.
 */

import { useId } from "react";
import { motion } from "framer-motion";
import { Armchair, Footprints, Moon, PersonStanding, Zap, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSessionStore } from "../store/session-store";
import type { ActivityType } from "../types";

const EASE = [0.16, 1, 0.3, 1] as const;

interface ActivityMeta {
  label: string;
  icon: LucideIcon;
}

const ACTIVITY_META: Record<ActivityType, ActivityMeta> = {
  standing: { label: "Standing", icon: PersonStanding },
  walking: { label: "Walking", icon: Footprints },
  running: { label: "Running", icon: Zap },
  sitting: { label: "Sitting", icon: Armchair },
  idle: { label: "Idle", icon: Moon },
};

const ACTIVITY_ORDER: ActivityType[] = ["standing", "walking", "running", "sitting", "idle"];

export function ActivityCards({ className }: { className?: string }) {
  const currentActivity = useSessionStore((s) => s.currentActivity);
  const layoutId = useId();

  return (
    <div
      role="group"
      aria-label="Current activity"
      className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5", className)}
    >
      {ACTIVITY_ORDER.map((activity) => {
        const { label, icon: Icon } = ACTIVITY_META[activity];
        const active = activity === currentActivity;

        return (
          <motion.div
            key={activity}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <Card
              className={cn(
                "relative flex flex-col items-center gap-2 overflow-hidden p-4 text-center transition-colors duration-200",
                active && "border-accent",
              )}
            >
              {active && (
                <motion.div
                  layoutId={`activity-highlight-${layoutId}`}
                  className="bg-accent-100 dark:bg-accent-900 absolute inset-0"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <div
                className={cn(
                  "relative z-10 flex size-9 items-center justify-center rounded-md",
                  active ? "bg-accent-500" : "bg-muted",
                )}
              >
                <Icon
                  className={cn(
                    "size-4",
                    active ? "text-accent-foreground" : "text-muted-foreground",
                  )}
                  strokeWidth={1.75}
                />
              </div>
              <p
                className={cn(
                  "relative z-10 text-sm font-medium",
                  active ? "text-accent-700 dark:text-accent-200" : "text-muted-foreground",
                )}
              >
                {label}
              </p>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

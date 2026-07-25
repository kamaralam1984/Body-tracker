"use client";

/**
 * Movement frequency — how often each activity state was entered.
 *
 * Chart choice: `ChartStackedBar` needs genuinely multiple series stacked
 * per x-value; this data is a single series (`occurrences`) keyed by one
 * category (`activity`), so a plain `ChartBar` is the more honest fit —
 * stacking a single series would just be a bar with extra ceremony.
 */

import { Armchair, Footprints, Moon, PersonStanding, Zap, type LucideIcon } from "lucide-react";
import { ChartBar } from "@/components/ui/charts/chart-bar";
import { AnalyticsCard, MetricCard } from "@/components/ui/card-variants";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMovementFrequencyQuery } from "../hooks/use-reporting-queries";
import type { ActivityType } from "@/features/session-analytics";

interface ActivityMeta {
  label: string;
  icon: LucideIcon;
}

// Mirrors the icon-per-activity mapping in
// `src/features/session-analytics/components/activity-cards.tsx` for
// consistency across the app.
const ACTIVITY_META: Record<ActivityType, ActivityMeta> = {
  standing: { label: "Standing", icon: PersonStanding },
  walking: { label: "Walking", icon: Footprints },
  running: { label: "Running", icon: Zap },
  sitting: { label: "Sitting", icon: Armchair },
  idle: { label: "Idle", icon: Moon },
};

const ACTIVITY_ORDER: ActivityType[] = ["standing", "walking", "running", "sitting", "idle"];

export function MovementAnalyticsSection({ className }: { className?: string }) {
  const { data, isLoading, isError } = useMovementFrequencyQuery();

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <Skeleton className="h-[336px] w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {ACTIVITY_ORDER.map((activity) => (
            <Skeleton key={activity} className="h-[76px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={cn("border-danger bg-danger-bg rounded-xl border p-6", className)}>
        <p className="text-danger-600 dark:text-danger-500 text-sm font-medium">
          Couldn&apos;t load movement analytics. Please try again.
        </p>
      </div>
    );
  }

  const chartData = data.map((point) => ({
    activity: ACTIVITY_META[point.activity].label,
    occurrences: point.occurrences,
  }));

  const occurrencesByActivity = new Map(data.map((point) => [point.activity, point.occurrences]));

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <AnalyticsCard title="Movement frequency">
        <ChartBar data={chartData} xKey="activity" dataKeys={["occurrences"]} />
      </AnalyticsCard>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {ACTIVITY_ORDER.map((activity) => {
          const { label, icon } = ACTIVITY_META[activity];
          return (
            <MetricCard
              key={activity}
              label={label}
              value={String(occurrencesByActivity.get(activity) ?? 0)}
              icon={icon}
            />
          );
        })}
      </div>
    </div>
  );
}

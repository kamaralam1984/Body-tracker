"use client";

/**
 * Chart-card set for Activity Intelligence.
 *
 * Chart choice for the two 7-point time series:
 * - Movement Trend (`count` per day) uses `ChartArea` — a continuous
 *   occurrence count over consecutive days reads naturally as a trend line,
 *   matching how the reporting feature treats similar count-over-time series.
 * - Daily Activity (`minutes` per day) uses `ChartBar` — each day is a
 *   discrete, independently-comparable total, which a column chart makes
 *   easier to compare bar-to-bar than an area fill would.
 */

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartArea } from "@/components/ui/charts/chart-area";
import { ChartBar } from "@/components/ui/charts/chart-bar";
import { ChartDonut } from "@/components/ui/charts/chart-donut";
import { ChartHeatmap } from "@/components/ui/charts/chart-heatmap";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { activityLabel } from "../lib/activity-format";
import type {
  ActivityDistributionPoint,
  ActivityHeatmapPoint,
  DailyActivityPoint,
  MovementTrendPoint,
} from "../types";

const CARD_MOTION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
};

export interface ActivityDistributionChartProps {
  data: ActivityDistributionPoint[];
  className?: string;
}

/** Folds long tails into "Other" so slice count never exceeds the chart's fixed 4-color ramp — beyond that, colors would repeat across non-adjacent, unrelated slices. */
function foldIntoTopSlices(data: ActivityDistributionPoint[], maxSlices = 3) {
  const sorted = [...data].sort((a, b) => b.minutes - a.minutes);
  const top = sorted.slice(0, maxSlices);
  const rest = sorted.slice(maxSlices);
  const otherMinutes = rest.reduce((sum, point) => sum + point.minutes, 0);
  const slices = top.map((point) => ({ name: activityLabel(point.kind), value: point.minutes }));
  if (otherMinutes > 0) slices.push({ name: "Other", value: otherMinutes });
  return slices;
}

export function ActivityDistributionChart({ data, className }: ActivityDistributionChartProps) {
  const chartData = foldIntoTopSlices(data);
  const totalMinutes = Math.round(data.reduce((sum, point) => sum + point.minutes, 0));

  return (
    <motion.div {...CARD_MOTION}>
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity Distribution</CardTitle>
          <CardDescription>
            Minutes spent in each activity over the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartDonut
            data={chartData}
            centerLabel={
              <div className="flex flex-col items-center">
                <span className="text-foreground text-lg font-semibold">{totalMinutes}</span>
                <span className="text-muted-foreground text-xs">min total</span>
              </div>
            }
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}

export interface MovementTrendChartProps {
  data: MovementTrendPoint[];
  className?: string;
}

export function MovementTrendChart({ data, className }: MovementTrendChartProps) {
  return (
    <motion.div {...CARD_MOTION}>
      <Card className={className}>
        <CardHeader>
          <CardTitle>Movement Trend</CardTitle>
          <CardDescription>Movement events logged per day over the last 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartArea
            data={data.map((point) => ({ label: point.label, count: point.count }))}
            xKey="label"
            dataKeys={["count"]}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}

export interface DailyActivityChartProps {
  data: DailyActivityPoint[];
  className?: string;
}

export function DailyActivityChart({ data, className }: DailyActivityChartProps) {
  return (
    <motion.div {...CARD_MOTION}>
      <Card className={className}>
        <CardHeader>
          <CardTitle>Daily Activity</CardTitle>
          <CardDescription>Total tracked minutes per day over the last 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartBar
            data={data.map((point) => ({ label: point.label, minutes: point.minutes }))}
            xKey="label"
            dataKeys={["minutes"]}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function deriveHeatmapLabels(data: ActivityHeatmapPoint[]): {
  xLabels: string[];
  yLabels: string[];
} {
  const xLabels: string[] = [];
  const seenHours = new Set<string>();
  const seenDays = new Set<string>();

  for (const point of data) {
    if (!seenHours.has(point.hour)) {
      seenHours.add(point.hour);
      xLabels.push(point.hour);
    }
    seenDays.add(point.day);
  }

  const yLabels = DAY_ORDER.filter((day) => seenDays.has(day));

  return { xLabels, yLabels };
}

export interface ActivityHeatmapChartProps {
  data: ActivityHeatmapPoint[];
  className?: string;
}

export function ActivityHeatmapChart({ data, className }: ActivityHeatmapChartProps) {
  const { xLabels, yLabels } = deriveHeatmapLabels(data);

  return (
    <motion.div {...CARD_MOTION}>
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
          <CardDescription>When activity happens across the week, by hour.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartHeatmap
            data={data.map((point) => ({ hour: point.hour, day: point.day, count: point.count }))}
            xLabels={xLabels}
            yLabels={yLabels}
            xKey="hour"
            yKey="day"
            valueKey="count"
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function ActivityChartsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 lg:grid-cols-2", className)}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-[260px] w-full rounded-lg" />
        </Card>
      ))}
    </div>
  );
}

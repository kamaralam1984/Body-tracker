"use client";

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { LegendPayload, TooltipContentProps } from "recharts";
import { cn } from "@/lib/utils";

/**
 * Single-or-dual-series radar (spider) chart with tooltip and legend.
 *
 * @example
 * <ChartRadar
 *   data={[{ metric: "Strength", current: 82, previous: 74 }]}
 *   angleKey="metric"
 *   dataKeys={["current", "previous"]}
 * />
 */

const DEFAULT_COLORS = [
  "var(--color-accent-500)",
  "var(--color-neutral-400)",
  "var(--color-neutral-300)",
  "var(--color-neutral-200)",
];

interface ChartRadarProps {
  data: Record<string, string | number>[];
  angleKey: string;
  dataKeys: string[];
  colors?: string[];
  className?: string;
  height?: number;
}

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="border-border bg-surface-elevated rounded-lg border px-3 py-2 text-sm shadow-lg">
      <p className="text-foreground font-medium">{label}</p>
      <div className="mt-1 flex flex-col gap-0.5">
        {payload.map((item) => (
          <div key={String(item.dataKey)} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{item.name}</span>
            <span className="text-foreground font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartLegend({ payload }: { payload?: readonly LegendPayload[] }) {
  if (!payload?.length) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
      {payload.map((entry) => (
        <div key={entry.value} className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartRadar({
  data,
  angleKey,
  dataKeys,
  colors = DEFAULT_COLORS,
  className,
  height = 280,
}: ChartRadarProps) {
  const showLegend = dataKeys.length > 1;

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
          <PolarGrid stroke="var(--color-border)" />
          <PolarAngleAxis
            dataKey={angleKey}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          />
          <PolarRadiusAxis
            stroke="var(--color-border)"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            axisLine={false}
          />
          <Tooltip content={ChartTooltip} />
          {showLegend && <Legend content={ChartLegend} />}
          {dataKeys.map((key, i) => (
            <Radar
              key={key}
              name={key}
              dataKey={key}
              stroke={colors[i % colors.length]}
              fill={colors[i % colors.length]}
              fillOpacity={0.1}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              isAnimationActive
              animationDuration={600}
              animationEasing="ease-out"
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LegendPayload, TooltipContentProps } from "recharts";
import { cn } from "@/lib/utils";

/**
 * Multi-or-single-series column chart with axes, gridlines, tooltip and legend.
 *
 * @example
 * <ChartBar
 *   data={[{ band: "0-59", count: 18 }, { band: "60-69", count: 42 }]}
 *   xKey="band"
 *   dataKeys={["count"]}
 * />
 */

const DEFAULT_COLORS = [
  "var(--color-accent-500)",
  "var(--color-neutral-400)",
  "var(--color-neutral-300)",
  "var(--color-neutral-200)",
];

interface ChartBarProps {
  data: Record<string, string | number>[];
  xKey: string;
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

export function ChartBar({
  data,
  xKey,
  dataKeys,
  colors = DEFAULT_COLORS,
  className,
  height = 260,
}: ChartBarProps) {
  const showLegend = dataKeys.length > 1;

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey={xKey}
            stroke="var(--color-border)"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            stroke="var(--color-border)"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          />
          <Tooltip
            content={ChartTooltip}
            cursor={{ fill: "var(--color-muted)", fillOpacity: 0.4 }}
          />
          {showLegend && <Legend content={ChartLegend} />}
          {dataKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[i % colors.length]}
              radius={[4, 4, 0, 0]}
              barSize={24}
              isAnimationActive
              animationDuration={600}
              animationEasing="ease-out"
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

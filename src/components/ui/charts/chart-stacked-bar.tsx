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
 * Stacked column chart for part-to-whole composition across categories.
 *
 * @example
 * <ChartStackedBar
 *   data={[{ month: "Jan", strength: 12, cardio: 8 }, { month: "Feb", strength: 14, cardio: 6 }]}
 *   xKey="month"
 *   dataKeys={["strength", "cardio"]}
 * />
 */

const DEFAULT_COLORS = [
  "var(--color-accent-500)",
  "var(--color-neutral-400)",
  "var(--color-neutral-300)",
  "var(--color-neutral-200)",
];

interface ChartStackedBarProps {
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

export function ChartStackedBar({
  data,
  xKey,
  dataKeys,
  colors = DEFAULT_COLORS,
  className,
  height = 260,
}: ChartStackedBarProps) {
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
          <Legend content={ChartLegend} />
          {dataKeys.map((key, i) => {
            const isLast = i === dataKeys.length - 1;
            return (
              <Bar
                key={key}
                dataKey={key}
                stackId="stack"
                fill={colors[i % colors.length]}
                stroke="var(--color-surface-elevated)"
                strokeWidth={2}
                radius={isLast ? [4, 4, 0, 0] : 0}
                barSize={24}
                isAnimationActive
                animationDuration={600}
                animationEasing="ease-out"
              />
            );
          })}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

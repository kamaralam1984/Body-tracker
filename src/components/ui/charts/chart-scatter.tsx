"use client";

import {
  CartesianGrid,
  Scatter,
  ScatterChart as RechartsScatterChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { cn } from "@/lib/utils";

/**
 * Single-series correlation scatter plot with axes, gridlines and tooltip.
 *
 * @example
 * <ChartScatter
 *   data={[{ weight: 82, reps: 6 }, { weight: 90, reps: 4 }]}
 *   xKey="weight"
 *   yKey="reps"
 * />
 */

interface ChartScatterProps {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  nameKey?: string;
  className?: string;
  height?: number;
}

function ChartTooltip({
  active,
  payload,
  xKey,
  yKey,
  nameKey,
}: TooltipContentProps & { xKey: string; yKey: string; nameKey?: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as Record<string, string | number>;

  return (
    <div className="border-border bg-surface-elevated rounded-lg border px-3 py-2 text-sm shadow-lg">
      {nameKey && point[nameKey] !== undefined && (
        <p className="text-foreground mb-1 font-medium">{point[nameKey]}</p>
      )}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: "var(--color-accent-500)" }}
          />
          <span className="text-muted-foreground">{xKey}</span>
          <span className="text-foreground font-medium">{point[xKey]}</span>
        </div>
        <div className="flex items-center gap-2 pl-4">
          <span className="text-muted-foreground">{yKey}</span>
          <span className="text-foreground font-medium">{point[yKey]}</span>
        </div>
      </div>
    </div>
  );
}

export function ChartScatter({
  data,
  xKey,
  yKey,
  nameKey,
  className,
  height = 260,
}: ChartScatterProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey={xKey}
            type="number"
            name={xKey}
            stroke="var(--color-border)"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            dataKey={yKey}
            type="number"
            name={yKey}
            stroke="var(--color-border)"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          />
          <Tooltip
            content={(props) => (
              <ChartTooltip
                {...(props as TooltipContentProps)}
                xKey={xKey}
                yKey={yKey}
                nameKey={nameKey}
              />
            )}
            cursor={{ stroke: "var(--color-border)" }}
          />
          <Scatter
            data={data}
            fill="var(--color-accent-500)"
            fillOpacity={0.7}
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
          />
        </RechartsScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

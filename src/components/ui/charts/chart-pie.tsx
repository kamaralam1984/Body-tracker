"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { LegendPayload, TooltipContentProps } from "recharts";
import { cn } from "@/lib/utils";

/**
 * Category-share pie chart — one accent slice + neutral-gray slices by default.
 *
 * @example
 * <ChartPie
 *   data={[
 *     { name: "Strength", value: 38 },
 *     { name: "Mobility", value: 27 },
 *   ]}
 * />
 */

const DEFAULT_COLORS = [
  "var(--color-accent-500)",
  "var(--color-neutral-400)",
  "var(--color-neutral-300)",
  "var(--color-neutral-200)",
];

interface ChartPieDatum {
  [key: string]: string | number;
}

interface ChartPieProps {
  data: ChartPieDatum[];
  dataKey?: string;
  nameKey?: string;
  colors?: string[];
  className?: string;
  height?: number;
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];

  return (
    <div className="border-border bg-surface-elevated rounded-lg border px-3 py-2 text-sm shadow-lg">
      <div className="flex items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: item.payload.fill }}
        />
        <span className="text-foreground font-medium">{item.name}</span>
        <span className="text-muted-foreground">{item.value}</span>
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

export function ChartPie({
  data,
  dataKey = "value",
  nameKey = "name",
  colors = DEFAULT_COLORS,
  className,
  height = 260,
}: ChartPieProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <Tooltip content={ChartTooltip} />
          <Legend content={ChartLegend} />
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius="80%"
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
          >
            {data.map((entry, i) => (
              <Cell key={`${entry[nameKey]}-${i}`} fill={colors[i % colors.length]} stroke="none" />
            ))}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

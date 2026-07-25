"use client";

/**
 * A trend-based forecast, presented honestly as "intelligent software being
 * helpful" rather than an AI prediction — the chart visually distinguishes
 * what already happened ("Actual") from the extrapolated remainder
 * ("Forecast") via two differently-colored series that share a connecting
 * point, built on the existing `ChartLine` primitive (no bespoke charting).
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLine } from "@/components/ui/charts/chart-line";
import { cn } from "@/lib/utils";
import { TrendBadge } from "./score-ring";
import type { Forecast } from "../types";

export function ForecastCard({ forecast, className }: { forecast: Forecast; className?: string }) {
  const firstProjectedIndex = forecast.points.findIndex((p) => p.projected);
  const chartData = forecast.points.map((point, i) => {
    const isBridge = firstProjectedIndex > 0 && i === firstProjectedIndex - 1;
    return {
      label: point.label,
      ...(point.projected ? {} : { "So far": point.value }),
      ...(point.projected || isBridge ? { Forecast: point.value } : {}),
    };
  });

  return (
    <Card className={cn("flex flex-col gap-4 p-0", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>{forecast.label}</CardTitle>
            <CardDescription>{forecast.summary}</CardDescription>
          </div>
          <TrendBadge trend={forecast.direction} />
        </div>
      </CardHeader>
      <CardContent>
        <ChartLine
          data={chartData}
          xKey="label"
          dataKeys={["So far", "Forecast"]}
          colors={["var(--color-accent-500)", "var(--color-neutral-300)"]}
          height={220}
        />
      </CardContent>
    </Card>
  );
}

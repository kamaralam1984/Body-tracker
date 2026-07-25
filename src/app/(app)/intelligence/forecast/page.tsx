"use client";

/**
 * The Forecast page — trend-based outlooks for the week ahead, presented as
 * calm, transparent software (never as "AI predictions"). `ForecastCard`
 * already carries the visual weight (chart, legend, trend badge); this page
 * is responsible for the honest framing, the grid layout, and a weekly
 * outlook summary computed live from the query data.
 */

import { motion, type Variants } from "framer-motion";
import { Compass, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ForecastCard } from "@/features/intelligence/components/forecast-card";
import { useForecastsQuery } from "@/features/intelligence/hooks/use-intelligence-queries";
import type { Forecast, ForecastMetric } from "@/features/intelligence/types";
import { cn } from "@/lib/utils";

const METRIC_ORDER: ForecastMetric[] = [
  "fatigue",
  "attention",
  "session-quality",
  "movement",
  "exercise-progress",
];

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

function metricName(forecast: Forecast): string {
  return forecast.label.replace(/\s*forecast$/i, "").toLowerCase();
}

function joinWithAnd(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/** Synthesizes one overall sentence from the live forecast data — never hardcoded. */
function buildWeeklyOutlookSummary(forecasts: Forecast[]): string {
  const improving = forecasts.filter((f) => f.direction === "improving");
  const declining = forecasts.filter((f) => f.direction === "declining");
  const stable = forecasts.filter((f) => f.direction === "stable");
  const total = forecasts.length;

  if (declining.length === 0 && stable.length === 0) {
    return "All areas are trending upward this week — whatever you're doing, it's working.";
  }
  if (improving.length === 0 && declining.length === 0) {
    return "Things are holding steady across the board this week — no notable shifts in either direction.";
  }
  if (declining.length === 0) {
    return `${improving.length} of ${total} areas are trending upward this week, and the rest are holding steady.`;
  }

  const watchList = joinWithAnd(declining.map(metricName));
  const verb = declining.length > 1 ? "are" : "is";
  if (improving.length === 0) {
    return `A few areas may need attention this week — ${watchList} ${verb} trending down.`;
  }
  const noun = declining.length > 1 ? "ones" : "one";
  return `${improving.length} of ${total} areas are trending upward this week — ${watchList} ${verb} the ${noun} to watch.`;
}

function ForecastCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("flex flex-col gap-4 p-0", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[220px] w-full" />
        <div className="mt-2 flex items-center gap-4">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function IntelligenceForecastPage() {
  const { data: forecasts, isLoading, isError } = useForecastsQuery();

  const orderedForecasts = forecasts
    ? [...forecasts].sort((a, b) => METRIC_ORDER.indexOf(a.metric) - METRIC_ORDER.indexOf(b.metric))
    : undefined;

  const isEmpty = !isLoading && (isError || !orderedForecasts || orderedForecasts.length === 0);

  return (
    <div className="flex flex-col gap-8">
      {/* Intro */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Compass className="text-muted-foreground size-4" strokeWidth={1.75} />
          <h2 className="text-foreground text-lg font-semibold tracking-tight">Forecast</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl text-sm">
          These outlooks are simple, transparent reads on where things are headed if your current
          patterns continue — no guesswork, just recent trends carried forward. Each card shows
          what&apos;s already happened alongside what&apos;s expected next, so you can see exactly
          how the outlook was reached.
        </p>
      </div>

      {/* Forecast grid */}
      {isLoading || !orderedForecasts ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <ForecastCardSkeleton key={i} className={i === 4 ? "lg:col-span-2" : undefined} />
          ))}
        </div>
      ) : isEmpty ? (
        <Card>
          <EmptyState
            icon={Compass}
            title="Outlooks aren't available right now"
            description="Check back after your next session."
            className="py-10"
          />
        </Card>
      ) : (
        <>
          <motion.div
            className="grid grid-cols-1 gap-6 lg:grid-cols-2"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {orderedForecasts.map((forecast) => (
              <motion.div
                key={forecast.id}
                variants={cardVariants}
                className={forecast.metric === "exercise-progress" ? "lg:col-span-2" : undefined}
              >
                <ForecastCard forecast={forecast} className="h-full" />
              </motion.div>
            ))}
          </motion.div>

          {/* Weekly outlook summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="text-muted-foreground size-4" strokeWidth={1.75} />
                <CardTitle>Weekly outlook</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-foreground text-sm">
                {buildWeeklyOutlookSummary(orderedForecasts)}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {(["improving", "stable", "declining"] as const).map((direction) => {
                  const count = orderedForecasts.filter((f) => f.direction === direction).length;
                  if (count === 0) return null;
                  const variant =
                    direction === "improving"
                      ? "success"
                      : direction === "declining"
                        ? "danger"
                        : "neutral";
                  return (
                    <Badge key={direction} variant={variant}>
                      {count} {direction}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

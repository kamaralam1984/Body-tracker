"use client";

/**
 * Detection rate gauges (current snapshot) + a detection stability timeline
 * (face/hand/pose over time). The two source queries are independent, so
 * one failing shows an inline error in its own section without blanking
 * the other.
 */

import { ChartLine } from "@/components/ui/charts/chart-line";
import { AnalyticsCard } from "@/components/ui/card-variants";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDetectionRatesQuery, useDetectionTimelineQuery } from "../hooks/use-reporting-queries";

const RATE_ROWS: { key: "face" | "hand" | "pose"; label: string }[] = [
  { key: "face", label: "Face" },
  { key: "hand", label: "Hand" },
  { key: "pose", label: "Pose" },
];

function DetectionRatesCard() {
  const { data, isLoading, isError } = useDetectionRatesQuery();

  return (
    <Card className="flex flex-col gap-4 p-6">
      <CardHeader className="p-0">
        <CardTitle>Detection rates</CardTitle>
      </CardHeader>
      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      )}
      {!isLoading && (isError || !data) && (
        <p className="text-danger-600 dark:text-danger-500 text-sm font-medium">
          Couldn&apos;t load detection rates. Please try again.
        </p>
      )}
      {!isLoading && data && (
        <div className="flex flex-col gap-4">
          {RATE_ROWS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <p className="text-muted-foreground text-sm font-medium">{label}</p>
              <Progress value={data[key]} showValue />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function DetectionStabilityCard() {
  const { data, isLoading, isError } = useDetectionTimelineQuery();

  return (
    <AnalyticsCard title="Detection stability">
      {isLoading && <Skeleton className="h-[260px] w-full rounded-lg" />}
      {!isLoading && (isError || !data) && (
        <p className="text-danger-600 dark:text-danger-500 text-sm font-medium">
          Couldn&apos;t load the detection stability timeline. Please try again.
        </p>
      )}
      {!isLoading && data && (
        <ChartLine
          data={data.map((point) => ({
            label: point.label,
            face: point.face,
            hand: point.hand,
            pose: point.pose,
          }))}
          xKey="label"
          dataKeys={["face", "hand", "pose"]}
        />
      )}
    </AnalyticsCard>
  );
}

export function DetectionAnalyticsSection({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <DetectionRatesCard />
      <DetectionStabilityCard />
    </div>
  );
}

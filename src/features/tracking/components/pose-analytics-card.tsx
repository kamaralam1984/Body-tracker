"use client";

/**
 * Live pose/movement readout — only renders once "pose" tracking mode is
 * turned on (off by default). Shows a live (short-window) movement-state
 * preview and in-progress exercise set reps — the authoritative,
 * longer-window version of movement state lives server-side
 * (`classifyMovementState()` in `intelligence-metrics-service.ts`) and
 * feeds the `/intelligence/movement` dashboard; this is a quick glance,
 * not the historical record.
 *
 * <PoseAnalyticsCard />
 */

import { PersonStanding } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTrackingContext } from "../context/tracking-provider";

const MOVEMENT_LABELS: Record<string, string> = {
  sitting: "Sitting",
  standing: "Standing",
  walking: "Walking",
  running: "Running",
  idle: "Idle",
};

function StatItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs tracking-wide uppercase">{label}</span>
      <span className="text-foreground text-sm font-medium">{value}</span>
    </div>
  );
}

export function PoseAnalyticsCard({ className }: { className?: string }) {
  const { config, live } = useTrackingContext();
  if (!config.modes.has("pose")) return null;

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <PersonStanding className="text-muted-foreground size-4" strokeWidth={1.75} />
          <CardTitle>Pose</CardTitle>
        </div>
        {live.currentMovementState && (
          <Badge variant="accent">{MOVEMENT_LABELS[live.currentMovementState]}</Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <StatItem
            label="Movement"
            value={live.currentMovementState ? MOVEMENT_LABELS[live.currentMovementState] : "—"}
          />
          <StatItem label="Current set reps" value={live.currentSetReps} />
          <StatItem label="Exercise sets" value={live.exerciseSetCountTotal} />
        </div>
      </CardContent>
    </Card>
  );
}

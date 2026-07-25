"use client";

/**
 * Live session summary — duration, active/idle time, blink/gesture/exercise
 * counts, attention high/low/avg — reads `useTrackingContext().live`
 * (see `use-tracking-session-sync.ts`). Same `StatItem` label/value grid
 * convention as `PerformancePanel`.
 *
 * <SessionSummaryCard />
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTrackingContext } from "../context/tracking-provider";

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function StatItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs tracking-wide uppercase">{label}</span>
      <span className="text-foreground text-sm font-medium">{value}</span>
    </div>
  );
}

export function SessionSummaryCard({ className }: { className?: string }) {
  const { live } = useTrackingContext();

  if (!live.sessionStartedAt) return null;

  const attentionAvg = live.attentionAvg !== null ? `${Math.round(live.attentionAvg)}` : "—";
  const attentionHigh = live.attentionHigh !== null ? `${Math.round(live.attentionHigh)}` : "—";
  const attentionLow = live.attentionLow !== null ? `${Math.round(live.attentionLow)}` : "—";

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Session summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <StatItem label="Duration" value={formatDuration(live.elapsedSeconds)} />
          <StatItem label="Active time" value={formatDuration(live.activeSeconds)} />
          <StatItem label="Idle time" value={formatDuration(live.idleSeconds)} />
          <StatItem label="Blink count" value={live.blinkCountTotal} />
          <StatItem label="Gesture count" value={live.gestureCountTotal} />
          <StatItem label="Exercise sets" value={live.exerciseSetCountTotal} />
          <StatItem label="Avg attention" value={attentionAvg} />
          <StatItem label="Highest / lowest" value={`${attentionHigh} / ${attentionLow}`} />
          <StatItem label="Calories (est.)" value={`~${live.caloriesEstimateLive}`} />
        </div>
      </CardContent>
    </Card>
  );
}

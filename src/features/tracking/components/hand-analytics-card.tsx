"use client";

/**
 * Live hand readout — only renders once "hand" tracking mode is turned on
 * (off by default, see `TrackingLegend`). Shows left/right visibility, the
 * currently-recognized static gesture (with its rule-based match strength,
 * not a raw ML confidence — gestures here are geometric threshold
 * classification, not a separate model), this session's gesture count, and
 * per-hand finger count/pinch distance/wrist rotation/speed/visibility, all
 * real measurements from the hand-landmarker output (see
 * use-tracking-session-sync.ts's HandLiveStats).
 *
 * <HandAnalyticsCard />
 */

import { Hand } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTrackingContext } from "../context/tracking-provider";
import type { HandLiveStats } from "../hooks/use-tracking-session-sync";

const GESTURE_LABELS: Record<string, string> = {
  wave: "Wave",
  "raise-hand": "Raised hand",
  point: "Point",
  "thumbs-up": "Thumbs up",
  pinch: "Pinch",
  "open-palm": "Open palm",
  "closed-hand": "Closed hand",
};

function StatItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs tracking-wide uppercase">{label}</span>
      <span className="text-foreground text-sm font-medium">{value}</span>
    </div>
  );
}

function HandSideStats({ label, stats }: { label: string; stats: HandLiveStats | null }) {
  if (!stats) return null;
  return (
    <div className="border-border-subtle flex flex-col gap-2 rounded-lg border p-3">
      <span className="text-foreground text-xs font-semibold">{label}</span>
      <div className="grid grid-cols-2 gap-3">
        <StatItem label="Fingers" value={stats.fingerCount} />
        <StatItem label="Pinch dist." value={stats.pinchDistRatio.toFixed(2)} />
        <StatItem label="Rotation" value={`${Math.round(stats.wristRotationDeg)}°`} />
        <StatItem label="Speed" value={stats.speed.toFixed(2)} />
        <StatItem label="Visibility" value={`${Math.round(stats.visibility * 100)}%`} />
      </div>
    </div>
  );
}

export function HandAnalyticsCard({ className }: { className?: string }) {
  const { config, live } = useTrackingContext();
  if (!config.modes.has("hand")) return null;

  const handLabel =
    live.handVisible.left && live.handVisible.right
      ? "Both hands"
      : live.handVisible.left
        ? "Left hand"
        : live.handVisible.right
          ? "Right hand"
          : "None";

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center gap-2">
        <Hand className="text-muted-foreground size-4" strokeWidth={1.75} />
        <CardTitle>Hand</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <StatItem label="Visible" value={handLabel} />
          <StatItem
            label="Current gesture"
            value={live.currentGesture ? GESTURE_LABELS[live.currentGesture] : "None"}
          />
          <StatItem
            label="Match strength"
            value={
              live.currentGestureMatchStrength !== null
                ? `${Math.round(live.currentGestureMatchStrength)}%`
                : "—"
            }
          />
          <StatItem label="Gesture count" value={live.gestureCountTotal} />
        </div>
        {(live.handStats.left || live.handStats.right) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <HandSideStats label="Left hand" stats={live.handStats.left} />
            <HandSideStats label="Right hand" stats={live.handStats.right} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

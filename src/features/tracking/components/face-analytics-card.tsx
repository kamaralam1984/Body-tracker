"use client";

/**
 * Live numeric face readout — head pitch/yaw/roll, blink count/rate, smile,
 * mouth open, looking-away, face-lost timer. Deliberately plain numbers/
 * booleans here (not a raw "confidence" percentage) — this card is the one
 * exception to the app's usual qualitative-only vocabulary, since it's an
 * explicit "developer/analytics" glance panel, not the main status badge.
 *
 * <FaceAnalyticsCard />
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTrackingContext } from "../context/tracking-provider";

function StatItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs tracking-wide uppercase">{label}</span>
      <span className="text-foreground text-sm font-medium">{value}</span>
    </div>
  );
}

function degrees(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}°`;
}

export function FaceAnalyticsCard({ className }: { className?: string }) {
  const { live } = useTrackingContext();

  const blinkRate =
    live.elapsedSeconds >= 10
      ? Math.round((live.blinkCountTotal / live.elapsedSeconds) * 60)
      : null;

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Face</CardTitle>
        <Badge variant={live.faceDetected ? "success" : "neutral"}>
          {live.faceDetected ? "Detected" : "Not detected"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <StatItem label="Head pitch" value={degrees(live.headPitch)} />
          <StatItem label="Head yaw" value={degrees(live.headYaw)} />
          <StatItem label="Head roll" value={degrees(live.headRoll)} />
          <StatItem label="Looking away" value={live.lookingAway ? "Yes" : "No"} />
          <StatItem label="Blink count" value={live.blinkCountTotal} />
          <StatItem label="Blink rate" value={blinkRate !== null ? `${blinkRate}/min` : "—"} />
          <StatItem label="Smile" value={live.smile ? "Yes" : "No"} />
          <StatItem label="Mouth open" value={live.mouthOpen ? "Yes" : "No"} />
          {live.faceLostSeconds > 0 && (
            <StatItem label="Face lost for" value={`${Math.round(live.faceLostSeconds)}s`} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

/**
 * Real hardware/track identity info — straight from
 * `MediaStreamTrack.getSettings()`, not the FPS/uptime sampling in
 * `performance-panel.tsx`. Shows nothing while no track is live rather than
 * a placeholder row.
 *
 * <DeviceInfoCard />
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";

function StatItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs tracking-wide uppercase">{label}</span>
      <span className="text-foreground truncate text-sm font-medium">{value}</span>
    </div>
  );
}

function truncateId(id: string | undefined): string {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 12)}…` : id;
}

function simplifyAspectRatio(width: number, height: number): string {
  if (!width || !height) return "—";
  function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
  }
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

export function DeviceInfoCard({ className }: { className?: string }) {
  const { stream } = useCameraContext();
  const track = stream?.getVideoTracks()[0];
  const trackSettings = track?.getSettings();

  if (!track || !trackSettings) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle>Device info</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs">No active camera track.</p>
        </CardContent>
      </Card>
    );
  }

  const width = trackSettings.width ?? 0;
  const height = trackSettings.height ?? 0;

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Device info</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <StatItem label="Label" value={track.label || "Unnamed camera"} />
          <StatItem label="Track state" value={track.readyState} />
          <StatItem
            label="Reported resolution"
            value={width && height ? `${width}×${height}` : "—"}
          />
          <StatItem label="Aspect ratio" value={simplifyAspectRatio(width, height)} />
          <StatItem
            label="Reported frame rate"
            value={trackSettings.frameRate ? `${Math.round(trackSettings.frameRate)} fps` : "—"}
          />
          <StatItem label="Facing mode" value={trackSettings.facingMode ?? "—"} />
          <StatItem label="Device ID" value={truncateId(trackSettings.deviceId)} />
          <StatItem label="Group ID" value={truncateId(trackSettings.groupId)} />
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

/**
 * Clean, professional stats card (think Zoom/Meet's connection-quality
 * chip, not a dev console) — a labeled grid of camera performance facts.
 * Reads `stats`/`devices`/`settings`/`status` from `useCameraContext()`.
 *
 * <PerformancePanel />
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";
import { StatusBadge } from "./status-badge";

function formatUptime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

interface StatItemProps {
  label: string;
  value: React.ReactNode;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs tracking-wide uppercase">{label}</span>
      <span className="text-foreground text-sm font-medium">{value}</span>
    </div>
  );
}

export function PerformancePanel({ className }: { className?: string }) {
  const { status, stats, devices, settings } = useCameraContext();

  const isActive = status === "running" || status === "paused";
  const activeDevice = devices.find((device) => device.deviceId === settings.deviceId);

  const resolution = stats.width && stats.height ? `${stats.width}×${stats.height}` : "—";
  const frameRate = status === "running" ? `${stats.fps} fps` : "—";
  const cameraLabel = activeDevice?.label ?? "Default camera";
  const uptime = isActive ? formatUptime(stats.uptimeMs) : "—";
  const samples = isActive ? stats.frameCount.toLocaleString() : "—";

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <StatItem label="Resolution" value={resolution} />
          <StatItem label="Frame rate" value={frameRate} />
          <StatItem label="Camera" value={cameraLabel} />
          <StatItem label="Status" value={<StatusBadge />} />
          <StatItem label="Uptime" value={uptime} />
          <StatItem label="Samples" value={samples} />
        </div>
      </CardContent>
    </Card>
  );
}

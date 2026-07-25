"use client";

/**
 * KPI selection (7 of the brief's proposed set — chosen to avoid duplicating
 * `ActivityCards`, which already covers "Current Activity" as a dedicated
 * strip): Active Session, Session Duration, Tracking Quality, Face Status,
 * Hand Status, Connection Health, Camera Status. Omitted "Body Status" /
 * "Movement Status" / "Current Activity" / "Average Stability" — the first
 * three overlap with the activity strip below this grid, and stability is a
 * tracking-quality-shaped metric already represented by Tracking Quality.
 */

import {
  Activity,
  Gauge,
  Hand,
  ScanFace,
  Timer,
  Video,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/card-variants";
import { StatTile } from "@/components/ui/stat-tile";
import { cn } from "@/lib/utils";
import { useSessionDuration, formatDuration } from "../hooks/use-session-duration";
import { useSessionStore } from "../store/session-store";
import type { QualityLevel, SessionStatus } from "../types";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

const SESSION_STATUS_META: Record<SessionStatus, { label: string; variant: BadgeVariant }> = {
  idle: { label: "Idle", variant: "neutral" },
  running: { label: "Running", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  completed: { label: "Completed", variant: "info" },
};

/** Mirrors `tracking-status-badge.tsx`'s variant mapping for the shared quality vocabulary. */
const QUALITY_META: Record<QualityLevel, { label: string; variant: BadgeVariant }> = {
  excellent: { label: "Excellent", variant: "success" },
  good: { label: "Good", variant: "success" },
  limited: { label: "Limited", variant: "warning" },
  searching: { label: "Searching…", variant: "info" },
  offline: { label: "Offline", variant: "neutral" },
};

const DOT_COLOR_CLASS: Record<BadgeVariant, string> = {
  neutral: "bg-muted-foreground",
  accent: "bg-accent-600 dark:bg-accent-300",
  success: "bg-success-600 dark:bg-success-500",
  warning: "bg-warning-600 dark:bg-warning-500",
  danger: "bg-danger-600 dark:bg-danger-500",
  info: "bg-info-600 dark:bg-info-500",
  outline: "bg-foreground",
};

interface SessionKpiGridProps {
  cameraStatusLabel: string;
  trackingQuality: QualityLevel;
  faceDetected: boolean;
  handDetected: boolean;
  connectionHealthy: boolean;
  className?: string;
}

/** Label + icon header row, mirroring `StatTile`'s header, with a `Badge` as the value slot. */
function BadgeValueTile({
  label,
  icon: Icon,
  badgeLabel,
  badgeVariant,
  className,
}: {
  label: string;
  icon: LucideIcon;
  badgeLabel: string;
  badgeVariant: BadgeVariant;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col gap-3 p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <div className="bg-muted flex size-8 items-center justify-center rounded-md">
          <Icon className="text-muted-foreground size-4" strokeWidth={1.75} />
        </div>
      </div>
      <Badge variant={badgeVariant} className="w-fit gap-1.5">
        <span className={cn("size-1.5 shrink-0 rounded-full", DOT_COLOR_CLASS[badgeVariant])} />
        {badgeLabel}
      </Badge>
    </Card>
  );
}

export function SessionKpiGrid({
  cameraStatusLabel,
  trackingQuality,
  faceDetected,
  handDetected,
  connectionHealthy,
  className,
}: SessionKpiGridProps) {
  const sessionStatus = useSessionStore((s) => s.session.status);
  const durationMs = useSessionDuration();

  const sessionMeta = SESSION_STATUS_META[sessionStatus];
  const qualityMeta = QUALITY_META[trackingQuality];

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      <BadgeValueTile
        label="Active Session"
        icon={Activity}
        badgeLabel={sessionMeta.label}
        badgeVariant={sessionMeta.variant}
      />

      <StatTile label="Session Duration" value={formatDuration(durationMs)} icon={Timer} />

      <BadgeValueTile
        label="Tracking Quality"
        icon={Gauge}
        badgeLabel={qualityMeta.label}
        badgeVariant={qualityMeta.variant}
      />

      <MetricCard
        label="Face Status"
        value={faceDetected ? "Detected" : "Not detected"}
        icon={ScanFace}
      />

      <MetricCard
        label="Hand Status"
        value={handDetected ? "Detected" : "Not detected"}
        icon={Hand}
      />

      <MetricCard
        label="Connection Health"
        value={connectionHealthy ? "Stable" : "Unstable"}
        icon={connectionHealthy ? Wifi : WifiOff}
      />

      <MetricCard label="Camera Status" value={cameraStatusLabel} icon={Video} />
    </div>
  );
}

"use client";

/**
 * Statistics grid for the Activity Intelligence dashboard — one `StatTile`
 * per `ActivityStatistics` field. Purely presentational; the caller supplies
 * the already-computed `statistics` object from `useActivityIntelligenceQuery`.
 */

import {
  Activity,
  Clock,
  Compass,
  Eye,
  Footprints,
  Hand,
  ShieldCheck,
  Smile,
  Star,
  Timer,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { activityLabel, formatDurationLabel } from "../lib/activity-format";
import type { ActivityStatistics, ConfidenceLevel } from "../types";

export interface ActivityStatisticsGridProps {
  statistics: ActivityStatistics;
  className?: string;
}

function qualityLabel(level: ConfidenceLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

interface TileSpec {
  label: string;
  value: string;
  icon: LucideIcon;
}

function buildTiles(statistics: ActivityStatistics): TileSpec[] {
  return [
    { label: "Total activities", value: String(statistics.totalActivities), icon: Activity },
    {
      label: "Current activity",
      value: statistics.currentActivity ? activityLabel(statistics.currentActivity) : "None",
      icon: Compass,
    },
    {
      label: "Total duration",
      value: formatDurationLabel(statistics.totalDurationMinutes * 60),
      icon: Clock,
    },
    {
      label: "Average duration",
      value: formatDurationLabel(statistics.averageDurationMinutes * 60),
      icon: Timer,
    },
    { label: "Movement count", value: String(statistics.movementCount), icon: Footprints },
    { label: "Smile count", value: String(statistics.smileCount), icon: Smile },
    { label: "Blink count", value: String(statistics.blinkCount), icon: Eye },
    { label: "Hand raise count", value: String(statistics.handRaiseCount), icon: Hand },
    { label: "Wave count", value: String(statistics.waveCount), icon: Waves },
    { label: "Most active session", value: statistics.mostActiveSession, icon: Star },
    {
      label: "Average tracking quality",
      value: qualityLabel(statistics.averageTrackingQuality),
      icon: ShieldCheck,
    },
  ];
}

export function ActivityStatisticsGrid({ statistics, className }: ActivityStatisticsGridProps) {
  const tiles = buildTiles(statistics);

  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {tiles.map((tile, index) => (
        <motion.div
          key={tile.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: index * 0.03 }}
        >
          <StatTile label={tile.label} value={tile.value} icon={tile.icon} className="h-full" />
        </motion.div>
      ))}
    </div>
  );
}

const SKELETON_TILE_COUNT = 11;

export function ActivityStatisticsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {Array.from({ length: SKELETON_TILE_COUNT }).map((_, index) => (
        <Card key={index} className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="size-8 rounded-md" />
          </div>
          <Skeleton className="h-7 w-16" />
        </Card>
      ))}
    </div>
  );
}

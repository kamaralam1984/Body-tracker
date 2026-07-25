"use client";

import { motion } from "framer-motion";
import {
  Battery,
  BatteryLow,
  BatteryMedium,
  Eye,
  Moon,
  PersonStanding,
  Smile,
  Sparkles,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLine } from "@/components/ui/charts/chart-line";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendBadge } from "@/features/intelligence/components/score-ring";
import {
  useFatigueSnapshotQuery,
  useFatigueTrendQuery,
} from "@/features/intelligence/hooks/use-intelligence-queries";
import type { DrowsinessStatus, EnergyLevel, FatigueLevel } from "@/features/intelligence/types";
import { cn } from "@/lib/utils";

const ENERGY_META: Record<
  EnergyLevel,
  { label: string; icon: typeof Battery; colorClass: string; iconBg: string }
> = {
  high: {
    label: "High energy",
    icon: Battery,
    colorClass: "text-success-600 dark:text-success-500",
    iconBg: "bg-success-bg",
  },
  moderate: {
    label: "Moderate energy",
    icon: BatteryMedium,
    colorClass: "text-warning-600 dark:text-warning-500",
    iconBg: "bg-warning-bg",
  },
  low: {
    label: "Low energy",
    icon: BatteryLow,
    colorClass: "text-danger-600 dark:text-danger-500",
    iconBg: "bg-danger-bg",
  },
};

const DROWSINESS_META: Record<
  DrowsinessStatus,
  { label: string; icon: typeof Smile; colorClass: string; iconBg: string; description: string }
> = {
  alert: {
    label: "Alert",
    icon: Smile,
    colorClass: "text-success-600 dark:text-success-500",
    iconBg: "bg-success-bg",
    description: "You're tracking sharp and steady right now.",
  },
  "slightly-tired": {
    label: "Slightly tired",
    icon: Moon,
    colorClass: "text-warning-600 dark:text-warning-500",
    iconBg: "bg-warning-bg",
    description: "A gentle dip in alertness — a short break could help.",
  },
  drowsy: {
    label: "Drowsy",
    icon: Moon,
    colorClass: "text-danger-600 dark:text-danger-500",
    iconBg: "bg-danger-bg",
    description: "Signs of real tiredness are showing up. Consider resting soon.",
  },
};

const FATIGUE_BADGE_VARIANT: Record<FatigueLevel, "success" | "warning" | "danger"> = {
  low: "success",
  moderate: "warning",
  high: "danger",
};

const FATIGUE_LABEL: Record<FatigueLevel, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

function recoverySummary(trend: "improving" | "stable" | "declining"): string {
  if (trend === "improving") return "Your recovery has been trending upward lately.";
  if (trend === "declining")
    return "Recovery has been slipping a little — worth keeping an eye on.";
  return "Recovery has been holding steady.";
}

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export default function WellnessPage() {
  const { data: snapshot, isLoading: snapshotLoading } = useFatigueSnapshotQuery();
  const { data: trend, isLoading: trendLoading } = useFatigueTrendQuery();

  const energyMeta = snapshot ? ENERGY_META[snapshot.energyLevel] : undefined;
  const drowsinessMeta = snapshot ? DROWSINESS_META[snapshot.drowsinessStatus] : undefined;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">Wellness</h2>
        <p className="text-muted-foreground text-sm">
          A calm read on your energy and recovery, built from how your day has actually gone.
        </p>
      </div>

      {/* Energy + Recovery header */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.3 }}
        >
          <Card className="flex h-full flex-col gap-4 p-6">
            {snapshotLoading || !snapshot || !energyMeta ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="size-12 rounded-full" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    "flex size-12 items-center justify-center rounded-full",
                    energyMeta.iconBg,
                  )}
                >
                  <energyMeta.icon
                    className={cn("size-6", energyMeta.colorClass)}
                    strokeWidth={1.75}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <p className={cn("text-2xl font-semibold tracking-tight", energyMeta.colorClass)}>
                    {energyMeta.label}
                  </p>
                  <TrendBadge trend={snapshot.fatigueTrend} />
                </div>
              </>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card className="flex h-full flex-col gap-3 p-6">
            <CardTitle>Recovery</CardTitle>
            {snapshotLoading || !snapshot ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : (
              <>
                <TrendBadge trend={snapshot.recoveryTrend} />
                <p className="text-muted-foreground text-sm">
                  {recoverySummary(snapshot.recoveryTrend)}
                </p>
                <p className="text-foreground text-sm">
                  Typically takes about{" "}
                  <span className="font-semibold">{snapshot.focusRecoveryMinutes} minutes</span> to
                  refocus after a break.
                </p>
              </>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Fatigue indicators + Alert status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Fatigue indicators</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {snapshotLoading || !snapshot ? (
                <>
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="text-muted-foreground size-4" strokeWidth={1.75} />
                      <span className="text-foreground text-sm">Eye fatigue</span>
                    </div>
                    <Badge variant={FATIGUE_BADGE_VARIANT[snapshot.eyeFatigueLevel]}>
                      {FATIGUE_LABEL[snapshot.eyeFatigueLevel]}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PersonStanding className="text-muted-foreground size-4" strokeWidth={1.75} />
                      <span className="text-foreground text-sm">Body fatigue</span>
                    </div>
                    <Badge variant={FATIGUE_BADGE_VARIANT[snapshot.bodyFatigueLevel]}>
                      {FATIGUE_LABEL[snapshot.bodyFatigueLevel]}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Alert status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {snapshotLoading || !snapshot || !drowsinessMeta ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full",
                        drowsinessMeta.iconBg,
                      )}
                    >
                      <drowsinessMeta.icon
                        className={cn("size-4", drowsinessMeta.colorClass)}
                        strokeWidth={1.75}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className={cn("text-sm font-semibold", drowsinessMeta.colorClass)}>
                        {drowsinessMeta.label}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {drowsinessMeta.description}
                      </span>
                    </div>
                  </div>

                  {snapshot.microsleepEventsToday > 0 && (
                    <div className="border-border flex items-center gap-2 rounded-lg border p-3">
                      <Sparkles
                        className="text-muted-foreground size-4 shrink-0"
                        strokeWidth={1.75}
                      />
                      <p className="text-muted-foreground text-sm">
                        A few brief attention lapses were noticed today.
                      </p>
                    </div>
                  )}

                  {snapshot.longSessionAlert && (
                    <Alert variant="info" title="Time for a stretch?">
                      You&apos;ve been at this for a while — a short break could help you come back
                      sharper.
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Energy trend */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Energy trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading || !trend ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <ChartLine
                data={trend.map((p) => ({ label: p.label, energyScore: p.energyScore }))}
                xKey="label"
                dataKeys={["energyScore"]}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

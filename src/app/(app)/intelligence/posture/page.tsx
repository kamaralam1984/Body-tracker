"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartBar } from "@/components/ui/charts/chart-bar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlignmentBadge } from "@/features/intelligence/components/alignment-badge";
import { ScoreRing } from "@/features/intelligence/components/score-ring";
import {
  usePostureSnapshotQuery,
  usePostureTrendQuery,
} from "@/features/intelligence/hooks/use-intelligence-queries";
import { cn } from "@/lib/utils";
import type { TrendDirection } from "@/features/intelligence/types";

function stabilityVariant(value: number): "success" | "warning" | "danger" {
  if (value >= 70) return "success";
  if (value >= 45) return "warning";
  return "danger";
}

const TREND_NARRATIVE: Record<TrendDirection, string> = {
  improving: "Posture has been improving over recent sessions",
  stable: "Posture has held steady this week",
  declining: "Posture has dipped a little over recent sessions",
};

const REVEAL = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function PosturePage() {
  const { data: snapshot, isLoading: snapshotLoading } = usePostureSnapshotQuery();
  const { data: trend, isLoading: trendLoading } = usePostureTrendQuery();

  const improvementPositive = snapshot ? snapshot.dailyImprovementPercent >= 0 : true;

  const narrative =
    snapshot &&
    (() => {
      const pct = Math.abs(snapshot.dailyImprovementPercent);
      const comparison = improvementPositive
        ? `a ${pct}% improvement compared to yesterday`
        : `a ${pct}% dip compared to yesterday`;
      return `${TREND_NARRATIVE[snapshot.trend]}, with ${comparison}. Small, consistent gains like this add up over time.`;
    })();

  return (
    <div className="flex flex-col gap-8">
      {/* Header row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <motion.div {...REVEAL} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
          <Card className="flex h-full flex-col items-center justify-center gap-2 p-6">
            {snapshotLoading || !snapshot ? (
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="size-[120px] rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <ScoreRing label="Posture" score={snapshot.score} size={120} trend={snapshot.trend} />
            )}
          </Card>
        </motion.div>

        <motion.div
          {...REVEAL}
          transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            {snapshotLoading || !snapshot ? (
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : (
              <>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-2xl font-semibold tabular-nums",
                    improvementPositive
                      ? "text-success-600 dark:text-success-500"
                      : "text-danger-600 dark:text-danger-500",
                  )}
                >
                  {improvementPositive ? (
                    <TrendingUp className="size-5" strokeWidth={2.25} />
                  ) : (
                    <TrendingDown className="size-5" strokeWidth={2.25} />
                  )}
                  {improvementPositive ? "+" : "-"}
                  {Math.abs(snapshot.dailyImprovementPercent)}%
                </span>
                <p className="text-muted-foreground text-sm">vs yesterday</p>
              </>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Alignment breakdown */}
      <motion.div {...REVEAL} transition={{ duration: 0.4, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}>
        <Card>
          <CardHeader>
            <CardTitle>Alignment breakdown</CardTitle>
            <CardDescription>How well each part of your posture held its position</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {snapshotLoading || !snapshot ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Shoulder alignment</span>
                  <AlignmentBadge quality={snapshot.shoulderAlignment} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Head alignment</span>
                  <AlignmentBadge quality={snapshot.headAlignment} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Neck position</span>
                  <AlignmentBadge quality={snapshot.neckPosition} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Body balance</span>
                  <AlignmentBadge quality={snapshot.bodyBalance} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stability */}
      <motion.div {...REVEAL} transition={{ duration: 0.4, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}>
        <Card>
          <CardHeader>
            <CardTitle>Stability</CardTitle>
            <CardDescription>How consistently posture held steady during tracking</CardDescription>
          </CardHeader>
          <CardContent>
            {snapshotLoading || !snapshot ? (
              <Skeleton className="h-1.5 w-full rounded-full" />
            ) : (
              <Progress
                value={snapshot.stability}
                variant={stabilityVariant(snapshot.stability)}
                showValue
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Posture trend */}
      <motion.div {...REVEAL} transition={{ duration: 0.4, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}>
        <Card>
          <CardHeader>
            <CardTitle>Posture trend</CardTitle>
            <CardDescription>Daily posture score over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading || !trend ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <ChartBar
                data={trend.map((p) => ({ label: p.label, score: p.score }))}
                xKey="label"
                dataKeys={["score"]}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Daily improvement narrative */}
      <motion.div {...REVEAL} transition={{ duration: 0.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}>
        <Card className="flex flex-col gap-2 p-6">
          <h3 className="text-foreground text-base font-semibold tracking-tight">
            Daily improvement
          </h3>
          {snapshotLoading || !snapshot ? (
            <Skeleton className="h-4 w-72" />
          ) : (
            <p className="text-muted-foreground text-sm">{narrative}</p>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

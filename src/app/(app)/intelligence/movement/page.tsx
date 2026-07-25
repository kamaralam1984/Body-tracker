"use client";

import { motion } from "framer-motion";
import {
  ArrowUp,
  Clock,
  Dumbbell,
  Flame,
  Hand,
  MousePointer2,
  Repeat,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartBar } from "@/components/ui/charts/chart-bar";
import { ChartDonut } from "@/components/ui/charts/chart-donut";
import { ChartLine } from "@/components/ui/charts/chart-line";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActivityIcon, activityLabel } from "@/features/activity-intelligence";
import { NoHistoryEmptyState } from "@/features/intelligence/components/intelligence-empty-states";
import {
  useActivityQualityTrendQuery,
  useExerciseSetsQuery,
  useGestureEventsQuery,
  useGestureSummariesQuery,
  useMovementPatternQuery,
  useWorkoutTrendQuery,
} from "@/features/intelligence/hooks/use-intelligence-queries";
import {
  formatDurationLabel,
  formatRelativeTime,
} from "@/features/intelligence/lib/intelligence-format";
import type { GestureType } from "@/features/intelligence/types";

const DONUT_COLORS = [
  "var(--color-accent-500)",
  "var(--color-info-500)",
  "var(--color-success-500)",
  "var(--color-warning-500)",
  "var(--color-neutral-400)",
];

const GESTURE_META: Record<GestureType, { label: string; icon: LucideIcon }> = {
  wave: { label: "Wave", icon: Hand },
  "raise-hand": { label: "Raised hand", icon: ArrowUp },
  point: { label: "Point", icon: MousePointer2 },
  "thumbs-up": { label: "Thumbs up", icon: ThumbsUp },
  pinch: { label: "Pinch", icon: Hand },
  "open-palm": { label: "Open palm", icon: Hand },
  "closed-hand": { label: "Closed hand", icon: Hand },
};

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

const GESTURE_EVENT_LIMIT = 10;

export default function MovementPage() {
  const { data: movementPattern, isLoading: movementPatternLoading } = useMovementPatternQuery();
  const { data: qualityTrend, isLoading: qualityTrendLoading } = useActivityQualityTrendQuery();
  const { data: exerciseSets, isLoading: exerciseSetsLoading } = useExerciseSetsQuery();
  const { data: workoutTrend, isLoading: workoutTrendLoading } = useWorkoutTrendQuery();
  const { data: gestureSummaries, isLoading: gestureSummariesLoading } = useGestureSummariesQuery();
  const { data: gestureEvents, isLoading: gestureEventsLoading } = useGestureEventsQuery();

  const totalMinutes = movementPattern?.reduce((sum, p) => sum + p.minutes, 0) ?? 0;
  const donutData =
    movementPattern?.map((p) => ({ name: activityLabel(p.activity), value: p.minutes })) ?? [];

  const totalReps = exerciseSets?.reduce((sum, s) => sum + s.reps, 0) ?? 0;
  const totalDurationSeconds = exerciseSets?.reduce((sum, s) => sum + s.durationSeconds, 0) ?? 0;
  const totalCalories = exerciseSets?.reduce((sum, s) => sum + s.caloriesEstimate, 0) ?? 0;

  const sortedExerciseSets = exerciseSets
    ? [...exerciseSets].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
    : undefined;

  const recentGestureEvents = gestureEvents
    ? [...gestureEvents]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, GESTURE_EVENT_LIMIT)
    : undefined;
  const extraGestureEventCount = gestureEvents
    ? Math.max(0, gestureEvents.length - GESTURE_EVENT_LIMIT)
    : 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">Movement</h2>
        <p className="text-muted-foreground text-sm">
          How you moved today, the exercise you logged, and the gestures picked up along the way.
        </p>
      </div>

      {/* Movement pattern */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Movement pattern</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="flex-1">
              {movementPatternLoading || !movementPattern ? (
                <Skeleton className="mx-auto h-[260px] w-[260px] rounded-full" />
              ) : movementPattern.length === 0 ? (
                <NoHistoryEmptyState className="py-10" />
              ) : (
                <ChartDonut
                  data={donutData}
                  colors={DONUT_COLORS}
                  centerLabel={
                    <div className="flex flex-col items-center">
                      <span className="text-foreground text-xl font-semibold tabular-nums">
                        {totalMinutes}
                      </span>
                      <span className="text-muted-foreground text-xs">minutes</span>
                    </div>
                  }
                />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-3">
              {movementPatternLoading || !movementPattern
                ? Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))
                : movementPattern.map((point) => (
                    <div key={point.activity} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ActivityIcon
                          kind={point.activity}
                          className="text-muted-foreground size-4"
                        />
                        <span className="text-foreground text-sm">
                          {activityLabel(point.activity)}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-sm tabular-nums">
                        {point.minutes} min
                      </span>
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Activity quality mini-trend */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Activity quality</CardTitle>
          </CardHeader>
          <CardContent>
            {qualityTrendLoading || !qualityTrend ? (
              <Skeleton className="h-[160px] w-full" />
            ) : (
              <ChartLine
                data={qualityTrend.map((p) => ({ label: p.label, quality: p.quality }))}
                xKey="label"
                dataKeys={["quality"]}
                height={160}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Exercise */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col gap-4"
      >
        <h3 className="text-foreground flex items-center gap-2 text-base font-semibold tracking-tight">
          <Dumbbell className="size-4" strokeWidth={1.75} />
          Exercise
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {exerciseSetsLoading || !exerciseSets ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[110px] w-full rounded-xl" />
            ))
          ) : (
            <>
              <StatTile label="Reps today" value={String(totalReps)} icon={Repeat} />
              <StatTile
                label="Total time"
                value={formatDurationLabel(totalDurationSeconds)}
                icon={Clock}
              />
              <StatTile label="Calories" value={String(totalCalories)} icon={Flame} />
            </>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Workout trend</CardTitle>
          </CardHeader>
          <CardContent>
            {workoutTrendLoading || !workoutTrend ? (
              <Skeleton className="h-[260px] w-full" />
            ) : workoutTrend.length === 0 ? (
              <NoHistoryEmptyState className="py-10" />
            ) : (
              <ChartBar
                data={workoutTrend.map((p) => ({ label: p.label, reps: p.reps }))}
                xKey="label"
                dataKeys={["reps"]}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent sets</CardTitle>
          </CardHeader>
          <CardContent>
            {exerciseSetsLoading || !sortedExerciseSets ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : sortedExerciseSets.length === 0 ? (
              <NoHistoryEmptyState className="py-10" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exercise</TableHead>
                    <TableHead>Reps</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Calories</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedExerciseSets.map((set) => (
                    <TableRow key={set.id}>
                      <TableCell className="font-medium">{set.exerciseName}</TableCell>
                      <TableCell>{set.reps}</TableCell>
                      <TableCell>{formatDurationLabel(set.durationSeconds)}</TableCell>
                      <TableCell>{set.caloriesEstimate}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelativeTime(set.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Gestures */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="flex flex-col gap-4"
      >
        <h3 className="text-foreground text-base font-semibold tracking-tight">Gestures</h3>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {gestureSummariesLoading || !gestureSummaries ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
            ))
          ) : gestureSummaries.length === 0 ? (
            <div className="col-span-full">
              <NoHistoryEmptyState className="py-10" />
            </div>
          ) : (
            gestureSummaries.map((summary) => {
              const meta = GESTURE_META[summary.type];
              const Icon = meta.icon;
              return (
                <Card key={summary.type} className="flex flex-col items-center gap-2 p-5">
                  <div className="bg-muted flex size-9 items-center justify-center rounded-full">
                    <Icon className="text-muted-foreground size-4" strokeWidth={1.75} />
                  </div>
                  <span className="text-foreground text-sm font-medium">{meta.label}</span>
                  <span className="text-muted-foreground text-xs">{summary.count} times</span>
                </Card>
              );
            })
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent gestures</CardTitle>
          </CardHeader>
          <CardContent>
            {gestureEventsLoading || !recentGestureEvents ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : recentGestureEvents.length === 0 ? (
              <NoHistoryEmptyState className="py-10" />
            ) : (
              <div className="flex flex-col gap-1">
                {recentGestureEvents.map((event) => {
                  const meta = GESTURE_META[event.type];
                  const Icon = meta.icon;
                  return (
                    <div key={event.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="flex items-center gap-2">
                        <Icon className="text-muted-foreground size-4" strokeWidth={1.75} />
                        <span className="text-foreground text-sm">{meta.label}</span>
                        <span className="text-muted-foreground text-xs">{event.sessionLabel}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {formatRelativeTime(event.timestamp)}
                      </span>
                    </div>
                  );
                })}
                {extraGestureEventCount > 0 && (
                  <p className="text-muted-foreground pt-2 text-center text-xs">
                    +{extraGestureEventCount} more gesture{extraGestureEventCount === 1 ? "" : "s"}{" "}
                    today
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

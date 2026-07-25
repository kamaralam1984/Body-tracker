"use client";

import { motion } from "framer-motion";
import { AlertCircle, Clock, Eye, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLine } from "@/components/ui/charts/chart-line";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NoHistoryEmptyState } from "@/features/intelligence/components/intelligence-empty-states";
import { ScoreRing, TrendBadge } from "@/features/intelligence/components/score-ring";
import {
  useAttentionSnapshotQuery,
  useDistractionEventsQuery,
  useFocusTimelineQuery,
} from "@/features/intelligence/hooks/use-intelligence-queries";
import {
  formatDurationLabel,
  formatTimeOnly,
} from "@/features/intelligence/lib/intelligence-format";
import type { EngagementLevel, TrendDirection } from "@/features/intelligence/types";

const ENGAGEMENT_LABEL: Record<EngagementLevel, string> = {
  "highly-engaged": "Highly engaged",
  engaged: "Engaged",
  "moderately-engaged": "Moderately engaged",
  distracted: "Distracted",
};

const ENGAGEMENT_VARIANT: Record<EngagementLevel, "success" | "warning" | "danger"> = {
  "highly-engaged": "success",
  engaged: "success",
  "moderately-engaged": "warning",
  distracted: "danger",
};

const TREND_COPY: Record<TrendDirection, string> = {
  improving: "Attention has been improving over recent sessions.",
  stable: "Attention has held steady over recent sessions.",
  declining: "Attention is trending down — consider shorter, more frequent focus blocks.",
};

/** formatDurationLabel rounds to whole minutes, which reads oddly for sub-minute
 * distraction events ("< 1 min" for a 12s glance away). This keeps the same
 * calm, plain-language tone but preserves seconds for short spans. */
function formatEventDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

const REVEAL = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function AttentionPage() {
  const { data: snapshot, isLoading: snapshotLoading } = useAttentionSnapshotQuery();
  const { data: timeline, isLoading: timelineLoading } = useFocusTimelineQuery();
  const { data: events, isLoading: eventsLoading } = useDistractionEventsQuery();

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
              <ScoreRing
                label="Attention"
                score={snapshot.score}
                size={120}
                trend={snapshot.trend}
              />
            )}
          </Card>
        </motion.div>

        <motion.div
          {...REVEAL}
          transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="flex h-full flex-col justify-center gap-4 p-6">
            {snapshotLoading || !snapshot ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-56" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Eye className="text-muted-foreground size-4" strokeWidth={1.75} />
                  <span className="text-muted-foreground text-sm">Engagement</span>
                  <Badge variant={ENGAGEMENT_VARIANT[snapshot.engagement]}>
                    {ENGAGEMENT_LABEL[snapshot.engagement]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="text-muted-foreground size-4" strokeWidth={1.75} />
                  <span className="text-muted-foreground text-sm">Focused for</span>
                  <span className="text-foreground text-sm font-medium">
                    {formatDurationLabel(snapshot.focusDurationMinutes * 60)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="text-muted-foreground size-4" strokeWidth={1.75} />
                  <span className="text-foreground text-sm font-medium">
                    Peak focus: {snapshot.peakFocusWindow}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-muted-foreground size-4" strokeWidth={1.75} />
                  <span className="text-muted-foreground text-sm">Distraction events today</span>
                  <span className="text-foreground text-sm font-medium">
                    {snapshot.distractionEventsToday}
                  </span>
                </div>
              </>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Focus timeline */}
      <motion.div {...REVEAL} transition={{ duration: 0.4, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}>
        <Card>
          <CardHeader>
            <CardTitle>Focus timeline</CardTitle>
            <CardDescription>How focus moved through the day</CardDescription>
          </CardHeader>
          <CardContent>
            {timelineLoading || !timeline ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <ChartLine
                data={timeline.map((p) => ({ time: p.time, focusScore: p.focusScore }))}
                xKey="time"
                dataKeys={["focusScore"]}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Distraction events */}
      <motion.div {...REVEAL} transition={{ duration: 0.4, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}>
        <Card>
          <CardHeader>
            <CardTitle>Distraction events</CardTitle>
            <CardDescription>Moments today where focus dropped off</CardDescription>
          </CardHeader>
          <CardContent>
            {eventsLoading || !events ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <NoHistoryEmptyState
                title="No distractions today"
                description="Nothing pulled focus away during tracked sessions — a clean run."
                className="py-6"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.label}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTimeOnly(event.timestamp)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right">
                        {formatEventDuration(event.durationSeconds)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Concentration trend */}
      <motion.div {...REVEAL} transition={{ duration: 0.4, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}>
        <Card className="flex flex-col gap-2 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground text-base font-semibold tracking-tight">
              Concentration trend
            </h3>
            {snapshot && <TrendBadge trend={snapshot.trend} />}
          </div>
          {snapshotLoading || !snapshot ? (
            <Skeleton className="h-4 w-64" />
          ) : (
            <p className="text-muted-foreground text-sm">{TREND_COPY[snapshot.trend]}</p>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

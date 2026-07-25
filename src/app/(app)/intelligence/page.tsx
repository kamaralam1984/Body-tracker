"use client";

import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartLine } from "@/components/ui/charts/chart-line";
import { BehaviorTimelineFeed } from "@/features/intelligence/components/behavior-timeline-feed";
import {
  NoHistoryEmptyState,
  NoRecommendationsEmptyState,
} from "@/features/intelligence/components/intelligence-empty-states";
import { MoodCard } from "@/features/intelligence/components/mood-card";
import { RecommendationCard } from "@/features/intelligence/components/recommendation-card";
import { ScoreRing } from "@/features/intelligence/components/score-ring";
import {
  useBehaviorTimelineQuery,
  useRecommendationsQuery,
  useWellnessSnapshotQuery,
  useWellnessTrendQuery,
} from "@/features/intelligence/hooks/use-intelligence-queries";
import type { TrendDirection } from "@/features/intelligence/types";

function overallTrend(deltas: number[]): { trend: TrendDirection; delta: number } {
  const average = deltas.length ? deltas.reduce((sum, d) => sum + d, 0) / deltas.length : 0;
  const rounded = Math.round(average * 10) / 10;
  if (rounded > 2) return { trend: "improving", delta: rounded };
  if (rounded < -2) return { trend: "declining", delta: rounded };
  return { trend: "stable", delta: rounded };
}

export default function IntelligenceOverviewPage() {
  const { data: snapshot, isLoading: snapshotLoading } = useWellnessSnapshotQuery();
  const { data: trend, isLoading: trendLoading } = useWellnessTrendQuery();
  const { data: recommendations, isLoading: recommendationsLoading } = useRecommendationsQuery();
  const { data: timeline, isLoading: timelineLoading } = useBehaviorTimelineQuery();

  const { trend: overallTrendDirection, delta: overallTrendDelta } = snapshot
    ? overallTrend(snapshot.pillars.map((p) => p.trendDelta))
    : { trend: "stable" as TrendDirection, delta: 0 };

  return (
    <div className="flex flex-col gap-8">
      {/* Hero row: overall wellness + mood */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card className="flex flex-col items-center justify-center gap-3 p-6">
          {snapshotLoading || !snapshot ? (
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="size-[140px] rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <>
              <ScoreRing
                label="Overall Wellness"
                score={snapshot.overallScore}
                size={140}
                trend={overallTrendDirection}
                trendDelta={overallTrendDelta}
              />
              <p className="text-muted-foreground text-xs">Updated {snapshot.computedAtLabel}</p>
            </>
          )}
        </Card>
        {snapshotLoading || !snapshot ? (
          <Skeleton className="h-full min-h-[176px] w-full rounded-xl" />
        ) : (
          <MoodCard
            mood={snapshot.mood}
            label={snapshot.moodLabel}
            description={snapshot.moodDescription}
            className="h-full"
          />
        )}
      </div>

      {/* Pillar cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {snapshotLoading || !snapshot
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="flex flex-col items-center gap-3 p-5">
                <Skeleton className="size-[88px] rounded-full" />
                <Skeleton className="h-3 w-20" />
              </Card>
            ))
          : snapshot.pillars.map((pillar) => (
              <Card key={pillar.id} className="flex flex-col items-center gap-2 p-5">
                <ScoreRing
                  label={pillar.label}
                  score={pillar.score}
                  size={88}
                  trend={pillar.trend}
                  trendDelta={pillar.trendDelta}
                />
                <p className="text-muted-foreground text-center text-xs">{pillar.summary}</p>
              </Card>
            ))}
      </div>

      {/* 7-day trend */}
      <Card>
        <CardHeader>
          <CardTitle>7-day trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trendLoading || !trend ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <ChartLine
              data={trend.map((point) => ({ label: point.label, score: point.score }))}
              xKey="label"
              dataKeys={["score"]}
            />
          )}
        </CardContent>
      </Card>

      {/* Today's recommendations */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-lg font-semibold tracking-tight">
            Today&apos;s recommendations
          </h2>
          {recommendations && recommendations.length > 3 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/intelligence/insights">
                See all
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          )}
        </div>
        {recommendationsLoading || !recommendations ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[168px] w-full rounded-xl" />
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <Card>
            <NoRecommendationsEmptyState className="py-10" />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.slice(0, 3).map((recommendation) => (
              <RecommendationCard key={recommendation.id} recommendation={recommendation} />
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-lg font-semibold tracking-tight">Recent activity</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/intelligence/insights">
              View full timeline
              <History className="size-3.5" />
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            {timelineLoading || !timeline ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : timeline.length === 0 ? (
              <NoHistoryEmptyState className="py-6" />
            ) : (
              <BehaviorTimelineFeed events={timeline.slice(0, 8)} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

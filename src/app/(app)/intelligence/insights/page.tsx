"use client";

import { AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BehaviorTimelineFeed } from "@/features/intelligence/components/behavior-timeline-feed";
import {
  NoHistoryEmptyState,
  NoInsightsEmptyState,
  NoRecommendationsEmptyState,
} from "@/features/intelligence/components/intelligence-empty-states";
import { RecommendationCard } from "@/features/intelligence/components/recommendation-card";
import {
  useBehaviorTimelineQuery,
  useInsightsQuery,
  useRecommendationsQuery,
} from "@/features/intelligence/hooks/use-intelligence-queries";
import { useIntelligenceStore } from "@/features/intelligence/store/intelligence-store";
import type {
  InsightCategory,
  IntelligenceInsight,
  InsightPeriod,
  InsightTone,
} from "@/features/intelligence/types";
import { cn } from "@/lib/utils";

const PERIOD_TABS: { value: InsightPeriod | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "executive", label: "Executive" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "session", label: "Session" },
];

const CATEGORY_LABEL: Record<InsightCategory, string> = {
  movement: "Movement",
  focus: "Focus",
  posture: "Posture",
  activity: "Activity",
  session: "Session",
};

const TONE_STYLES: Record<InsightTone, { icon: LucideIcon; iconClass: string }> = {
  positive: {
    icon: CheckCircle2,
    iconClass: "bg-success-bg text-success-600 dark:text-success-500",
  },
  negative: { icon: AlertTriangle, iconClass: "bg-danger-bg text-danger-600 dark:text-danger-500" },
  neutral: { icon: Info, iconClass: "bg-muted text-muted-foreground" },
};

function IntelligenceInsightCard({
  insight,
  className,
}: {
  insight: IntelligenceInsight;
  className?: string;
}) {
  const { icon: Icon, iconClass } = TONE_STYLES[insight.tone];
  return (
    <Card className={cn("flex items-start gap-3 p-5", className)}>
      <div
        className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", iconClass)}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="text-foreground text-sm font-semibold">{insight.title}</p>
          <Badge variant="outline">{CATEGORY_LABEL[insight.category]}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">{insight.description}</p>
      </div>
    </Card>
  );
}

export default function IntelligenceInsightsPage() {
  const insightPeriod = useIntelligenceStore((s) => s.insightPeriod);
  const setInsightPeriod = useIntelligenceStore((s) => s.setInsightPeriod);

  const { data: insights, isLoading: insightsLoading } = useInsightsQuery();
  const { data: recommendations, isLoading: recommendationsLoading } = useRecommendationsQuery();
  const { data: timeline, isLoading: timelineLoading } = useBehaviorTimelineQuery();

  const filteredInsights =
    insights === undefined
      ? undefined
      : insightPeriod === "all"
        ? insights
        : insights.filter((i) => i.period === insightPeriod);

  return (
    <div className="flex flex-col gap-8">
      {/* Period filter */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-foreground text-lg font-semibold tracking-tight">Insights</h2>
          <p className="text-muted-foreground text-sm">
            Human-readable observations drawn from your tracked focus, movement, posture, and
            session activity.
          </p>
        </div>
        <Tabs
          value={insightPeriod}
          onValueChange={(v) => setInsightPeriod(v as InsightPeriod | "all")}
        >
          <TabsList>
            {PERIOD_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {insightsLoading || filteredInsights === undefined ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[92px] w-full rounded-xl" />
            ))}
          </div>
        ) : filteredInsights.length === 0 ? (
          <Card>
            <NoInsightsEmptyState className="py-10" />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredInsights.map((insight) => (
              <IntelligenceInsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-foreground text-lg font-semibold tracking-tight">Recommendations</h2>
          <p className="text-muted-foreground text-sm">
            Small, practical actions worth taking today — act on one or dismiss it if it
            doesn&apos;t apply.
          </p>
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
            <AnimatePresence mode="popLayout">
              {recommendations.map((recommendation) => (
                <RecommendationCard key={recommendation.id} recommendation={recommendation} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Full behavior timeline */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-foreground text-lg font-semibold tracking-tight">
            Full behavior timeline
          </h2>
          <p className="text-muted-foreground text-sm">
            Every notable moment your intelligence profile has picked up, most recent first.
          </p>
        </div>
        <Card>
          <div className="p-6">
            {timelineLoading || !timeline ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : timeline.length === 0 ? (
              <NoHistoryEmptyState className="py-6" />
            ) : (
              <BehaviorTimelineFeed events={timeline} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

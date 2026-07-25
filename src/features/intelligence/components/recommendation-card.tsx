"use client";

/**
 * Elegant, actionable recommendation card — presented as helpful software
 * being helpful, never as an "AI suggestion". Wired to the real store
 * (`dismissRecommendation`/`completeRecommendation`), so acting on or
 * dismissing a card genuinely removes it from the list via
 * `useRecommendationsQuery`'s filter.
 */

import { motion } from "framer-motion";
import {
  Check,
  Coffee,
  Droplet,
  Footprints,
  PersonStanding,
  Target,
  Wind,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useIntelligenceStore } from "../store/intelligence-store";
import type { Recommendation, RecommendationPriority } from "../types";

const CATEGORY_ICON: Record<Recommendation["category"], LucideIcon> = {
  posture: PersonStanding,
  break: Coffee,
  stretch: Wind,
  fatigue: Coffee,
  focus: Target,
  hydration: Droplet,
  movement: Footprints,
};

const PRIORITY_VARIANT: Record<RecommendationPriority, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

export function RecommendationCard({
  recommendation,
  className,
}: {
  recommendation: Recommendation;
  className?: string;
}) {
  const dismissRecommendation = useIntelligenceStore((s) => s.dismissRecommendation);
  const completeRecommendation = useIntelligenceStore((s) => s.completeRecommendation);
  const Icon = CATEGORY_ICON[recommendation.category];

  function handleAct() {
    completeRecommendation(recommendation.id);
    toast.success(recommendation.actionLabel, { description: recommendation.title });
  }

  function handleDismiss() {
    dismissRecommendation(recommendation.id);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className={cn("flex flex-col gap-3 p-5", className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
            <Icon className="text-muted-foreground size-4" strokeWidth={1.75} />
          </div>
          <Badge variant={PRIORITY_VARIANT[recommendation.priority]} className="capitalize">
            {recommendation.priority}
          </Badge>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-foreground text-sm font-semibold">{recommendation.title}</p>
          <p className="text-muted-foreground text-sm">{recommendation.description}</p>
        </div>
        <div className="mt-auto flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handleAct}>
            <Check className="size-3.5" />
            {recommendation.actionLabel}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDismiss} aria-label="Dismiss">
            <X className="size-3.5" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

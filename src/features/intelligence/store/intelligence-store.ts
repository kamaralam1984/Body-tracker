"use client";

import { create } from "zustand";
import type { InsightPeriod } from "../types";

interface IntelligenceState {
  insightPeriod: InsightPeriod | "all";
  setInsightPeriod: (period: InsightPeriod | "all") => void;

  dismissedRecommendationIds: Set<string>;
  dismissRecommendation: (id: string) => void;

  completedRecommendationIds: Set<string>;
  completeRecommendation: (id: string) => void;
}

export const useIntelligenceStore = create<IntelligenceState>((set, get) => ({
  insightPeriod: "all",
  setInsightPeriod: (period) => set({ insightPeriod: period }),

  dismissedRecommendationIds: new Set(),
  dismissRecommendation: (id) =>
    set({ dismissedRecommendationIds: new Set(get().dismissedRecommendationIds).add(id) }),

  completedRecommendationIds: new Set(),
  completeRecommendation: (id) =>
    set({ completedRecommendationIds: new Set(get().completedRecommendationIds).add(id) }),
}));

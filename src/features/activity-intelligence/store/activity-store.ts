"use client";

import { create } from "zustand";
import { DEFAULT_ACTIVITY_FILTERS } from "../types";
import type { ActivityFilters } from "../types";

interface ActivityStoreState {
  filters: ActivityFilters;
  setFilters: (filters: ActivityFilters) => void;
  resetFilters: () => void;

  favoriteIds: Set<string>;
  toggleFavorite: (id: string) => void;

  historyView: "list" | "table";
  setHistoryView: (view: "list" | "table") => void;
}

export const useActivityStore = create<ActivityStoreState>((set, get) => ({
  filters: DEFAULT_ACTIVITY_FILTERS,
  setFilters: (filters) => set({ filters }),
  resetFilters: () => set({ filters: DEFAULT_ACTIVITY_FILTERS }),

  favoriteIds: new Set(),
  toggleFavorite: (id) => {
    const next = new Set(get().favoriteIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ favoriteIds: next });
  },

  historyView: "list",
  setHistoryView: (view) => set({ historyView: view }),
}));

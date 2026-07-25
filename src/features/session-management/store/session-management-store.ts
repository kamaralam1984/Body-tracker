"use client";

import { create } from "zustand";
import type { SessionTabValue, SessionViewMode } from "../types";

interface SessionManagementState {
  viewMode: SessionViewMode;
  setViewMode: (mode: SessionViewMode) => void;

  activeTab: SessionTabValue;
  setActiveTab: (tab: SessionTabValue) => void;

  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;

  starredIds: Set<string>;
  toggleStarred: (id: string) => void;

  detailsSessionId: string | null;
  openDetails: (id: string) => void;
  closeDetails: () => void;
}

export const useSessionManagementStore = create<SessionManagementState>((set, get) => ({
  viewMode: "grid",
  setViewMode: (mode) => set({ viewMode: mode }),

  activeTab: "all",
  setActiveTab: (tab) => set({ activeTab: tab }),

  selectedIds: new Set(),
  toggleSelected: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),

  starredIds: new Set(),
  toggleStarred: (id) => {
    const next = new Set(get().starredIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ starredIds: next });
  },

  detailsSessionId: null,
  openDetails: (id) => set({ detailsSessionId: id }),
  closeDetails: () => set({ detailsSessionId: null }),
}));

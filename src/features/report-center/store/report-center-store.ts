"use client";

import { create } from "zustand";
import { DEFAULT_REPORT_FILTERS } from "../types";
import type { ReportFilters, ReportRecord, ReportTabValue, ReportViewMode } from "../types";

interface ReportCenterState {
  activeTab: ReportTabValue;
  setActiveTab: (tab: ReportTabValue) => void;

  viewMode: ReportViewMode;
  setViewMode: (mode: ReportViewMode) => void;

  filters: ReportFilters;
  setFilters: (filters: ReportFilters) => void;
  resetFilters: () => void;

  favoriteOverrides: Map<string, boolean>;
  toggleFavorite: (id: string) => void;
  isFavorite: (report: ReportRecord) => boolean;

  viewerReportId: string | null;
  openViewer: (id: string) => void;
  closeViewer: () => void;

  newReportOpen: boolean;
  openNewReport: () => void;
  closeNewReport: () => void;

  createdReports: ReportRecord[];
  addCreatedReport: (report: ReportRecord) => void;
}

export const useReportCenterStore = create<ReportCenterState>((set, get) => ({
  activeTab: "all",
  setActiveTab: (tab) => set({ activeTab: tab }),

  viewMode: "grid",
  setViewMode: (mode) => set({ viewMode: mode }),

  filters: DEFAULT_REPORT_FILTERS,
  setFilters: (filters) => set({ filters }),
  resetFilters: () => set({ filters: DEFAULT_REPORT_FILTERS }),

  favoriteOverrides: new Map(),
  toggleFavorite: (id) => {
    const next = new Map(get().favoriteOverrides);
    const current = next.has(id) ? next.get(id)! : undefined;
    next.set(id, !current);
    set({ favoriteOverrides: next });
  },
  isFavorite: (report) => {
    const override = get().favoriteOverrides.get(report.id);
    return override === undefined ? report.favorite : override;
  },

  viewerReportId: null,
  openViewer: (id) => set({ viewerReportId: id }),
  closeViewer: () => set({ viewerReportId: null }),

  newReportOpen: false,
  openNewReport: () => set({ newReportOpen: true }),
  closeNewReport: () => set({ newReportOpen: false }),

  createdReports: [],
  addCreatedReport: (report) =>
    set((state) => ({ createdReports: [report, ...state.createdReports] })),
}));

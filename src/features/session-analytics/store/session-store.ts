"use client";

import { create } from "zustand";
import type { ActivityType, CurrentSession, TimelineEvent, TimelineEventType } from "../types";

const MAX_TIMELINE_EVENTS = 50;
const MAX_ACTIVITY_HISTORY = 200;

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface SessionStoreState {
  session: CurrentSession;
  timeline: TimelineEvent[];
  activityHistory: { activity: ActivityType; timestamp: number }[];
  currentActivity: ActivityType;

  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;
  addTimelineEvent: (type: TimelineEventType, label: string, description?: string) => void;
  setActivity: (activity: ActivityType) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  session: { id: makeId(), startedAt: null, status: "idle" },
  timeline: [],
  activityHistory: [],
  currentActivity: "idle",

  startSession: () => {
    if (get().session.status === "running") return;
    set({ session: { id: makeId(), startedAt: Date.now(), status: "running" } });
    get().addTimelineEvent("session-started", "Session started");
  },

  pauseSession: () => {
    set((state) => ({ session: { ...state.session, status: "paused" } }));
    get().addTimelineEvent("tracking-paused", "Tracking paused");
  },

  resumeSession: () => {
    set((state) => ({ session: { ...state.session, status: "running" } }));
    get().addTimelineEvent("tracking-resumed", "Tracking resumed");
  },

  endSession: () => {
    if (get().session.status === "idle") return;
    set((state) => ({ session: { ...state.session, status: "completed" } }));
    get().addTimelineEvent("session-ended", "Session ended");
  },

  addTimelineEvent: (type, label, description) =>
    set((state) => ({
      timeline: [
        { id: makeId(), type, timestamp: Date.now(), label, description },
        ...state.timeline,
      ].slice(0, MAX_TIMELINE_EVENTS),
    })),

  setActivity: (activity) =>
    set((state) => {
      if (state.currentActivity === activity) return state;
      return {
        currentActivity: activity,
        activityHistory: [...state.activityHistory, { activity, timestamp: Date.now() }].slice(
          -MAX_ACTIVITY_HISTORY,
        ),
      };
    }),

  reset: () =>
    set({
      session: { id: makeId(), startedAt: null, status: "idle" },
      timeline: [],
      activityHistory: [],
      currentActivity: "idle",
    }),
}));

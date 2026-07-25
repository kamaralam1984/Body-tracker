"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchSessionById,
  fetchSessionComments,
  fetchSessions,
  fetchSessionTimeline,
} from "../lib/mock-session-service";

export function useSessionsQuery() {
  return useQuery({ queryKey: ["session-management", "sessions"], queryFn: fetchSessions });
}

export function useSessionQuery(id: string | null) {
  return useQuery({
    queryKey: ["session-management", "session", id],
    queryFn: () => fetchSessionById(id as string),
    enabled: Boolean(id),
  });
}

export function useSessionTimelineQuery(id: string | null) {
  return useQuery({
    queryKey: ["session-management", "timeline", id],
    queryFn: () => fetchSessionTimeline(id as string),
    enabled: Boolean(id),
  });
}

export function useSessionCommentsQuery(id: string | null) {
  return useQuery({
    queryKey: ["session-management", "comments", id],
    queryFn: () => fetchSessionComments(id as string),
    enabled: Boolean(id),
  });
}

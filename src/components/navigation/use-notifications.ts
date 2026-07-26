"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetchJson } from "@/features/auth/lib/api-client";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

interface NotificationListResponse {
  items: AppNotification[];
  nextCursor: string | null;
  total: number;
  unreadCount: number;
}

const NOTIFICATIONS_QUERY_KEY = ["notifications"];

/** Real personal notifications (`/api/v1/notifications`) — polls every 60s so the bell reflects background sweep events (near-expiry, failed-auth spikes) without a websocket. */
export function useNotificationsQuery() {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => apiFetchJson<NotificationListResponse>("/api/v1/notifications?limit=20"),
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetchJson<AppNotification>(`/api/v1/notifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ read: true }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetchJson<{ updated: number }>("/api/v1/notifications/read-all", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });
}

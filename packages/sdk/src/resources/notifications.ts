import type { KvlClient } from "../client";
import type { PageResult } from "./types";

/** A real in-app notification — always self-scoped to the caller's own `userId`. */
export interface Notification {
  id: string;
  orgId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ListNotificationsParams {
  cursor?: string;
  limit?: number;
  unreadOnly?: boolean;
}

/** Same shape as `PageResult<Notification>` plus a real unread count, computed alongside the page rather than derived from it. */
export interface NotificationListResult extends PageResult<Notification> {
  unreadCount: number;
}

/**
 * `client.notifications` — the caller's own real in-app notifications.
 * Always self-scoped by the caller's `userId` (never `orgId`), the same way
 * `/users/me` isn't scope-gated — a notification is inherently personal.
 */
export class NotificationsResource {
  constructor(private client: KvlClient) {}

  list(params: ListNotificationsParams = {}): Promise<NotificationListResult> {
    return this.client.request({ method: "GET", path: "/notifications", query: { ...params } });
  }

  /** Marks a single notification read/unread — 404s (not 403s) on someone else's notification, so existence isn't leaked across users. */
  markRead(id: string, read: boolean): Promise<Notification> {
    return this.client.request({ method: "PATCH", path: `/notifications/${id}`, body: { read } });
  }

  /** Marks every one of the caller's own unread notifications as read. */
  markAllRead(): Promise<{ updated: number }> {
    return this.client.request({ method: "POST", path: "/notifications/read-all" });
  }
}

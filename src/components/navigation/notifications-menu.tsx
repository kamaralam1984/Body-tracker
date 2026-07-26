"use client";

/**
 * Real notification bell — `/api/v1/notifications` (see
 * `use-notifications.ts`), polled every 60s. Every row here is a genuine
 * event a real backend trigger created (key created/rotated/revoked/
 * permission-changed/near-expiry, or a security sweep detecting a
 * failed-auth spike or repeated rate-limit hits) — not mock data.
 */

import { Bell } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/features/settings/lib/settings-format";
import {
  useNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  type AppNotification,
} from "./use-notifications";

export function NotificationsMenu() {
  const { data } = useNotificationsQuery();
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  const notifications = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  function handleClick(notification: AppNotification) {
    if (!notification.read) markReadMutation.mutate(notification.id);
  }

  return (
    <Popover
      placement="bottom-end"
      className="w-80 p-0"
      trigger={
        <button
          type="button"
          aria-label="Notifications"
          className="text-muted-foreground hover:bg-muted hover:text-foreground relative flex size-9 items-center justify-center rounded-md transition-colors duration-150"
        >
          <Bell className="size-[18px]" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="bg-accent ring-surface absolute top-1.5 right-1.5 flex size-2 rounded-full ring-2" />
          )}
        </button>
      }
    >
      <div className="border-border-subtle flex items-center justify-between border-b px-4 py-3">
        <p className="text-foreground text-sm font-semibold">Notifications</p>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && <Badge variant="accent">{unreadCount} new</Badge>}
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>
      <div className="flex max-h-80 flex-col overflow-y-auto p-1.5">
        {notifications.length === 0 ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">
            No notifications yet.
          </p>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              className={cn(
                "hover:bg-muted flex w-full flex-col gap-0.5 rounded-md px-3 py-2.5 text-left transition-colors duration-100",
              )}
            >
              <div className="flex items-center gap-2">
                {!n.read && <span className="bg-accent size-1.5 shrink-0 rounded-full" />}
                <p className="text-foreground text-sm font-medium">{n.title}</p>
              </div>
              <p className="text-muted-foreground text-xs">{n.body}</p>
              <p className="text-muted-foreground/70 text-[11px]">
                {formatRelativeDate(n.createdAt)}
              </p>
            </button>
          ))
        )}
      </div>
    </Popover>
  );
}

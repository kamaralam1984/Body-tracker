"use client";

import { Bell } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const notifications = [
  {
    id: 1,
    title: "Weekly report is ready",
    description: "Your analytics summary for last week has been generated.",
    time: "2h ago",
    unread: true,
  },
  {
    id: 2,
    title: "New session recorded",
    description: "A new tracking session was added to your workspace.",
    time: "5h ago",
    unread: true,
  },
  {
    id: 3,
    title: "Team invite accepted",
    description: "Alex Chen joined your workspace.",
    time: "1d ago",
    unread: false,
  },
];

export function NotificationsMenu() {
  const unreadCount = notifications.filter((n) => n.unread).length;

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
        {unreadCount > 0 && <Badge variant="accent">{unreadCount} new</Badge>}
      </div>
      <div className="flex max-h-80 flex-col overflow-y-auto p-1.5">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={cn(
              "hover:bg-muted flex flex-col gap-0.5 rounded-md px-3 py-2.5 transition-colors duration-100",
            )}
          >
            <div className="flex items-center gap-2">
              {n.unread && <span className="bg-accent size-1.5 shrink-0 rounded-full" />}
              <p className="text-foreground text-sm font-medium">{n.title}</p>
            </div>
            <p className="text-muted-foreground text-xs">{n.description}</p>
            <p className="text-muted-foreground/70 text-[11px]">{n.time}</p>
          </div>
        ))}
      </div>
    </Popover>
  );
}

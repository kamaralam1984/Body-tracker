"use client";

/**
 * Webhooks list. Row status uses a local optimistic override map
 * (`statusOverrides`, keyed by webhook id) for Disable/Enable — mirroring
 * the technique in `@/features/admin/components/api-key-table.tsx` — so the
 * badge flips immediately without any backend to persist against. Deleting
 * seeded webhooks is an honest `toast.info` stub matching this app's
 * established convention (creation is the one real, wired-up flow).
 */

import { useState } from "react";
import { MoreHorizontal, Webhook as WebhookIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { formatAbsoluteDate, useSettingsStore, useWebhooksQuery } from "@/features/settings";
import type { Webhook, WebhookStatus } from "@/features/settings";
import { CreateWebhookDialog } from "@/features/settings/components/create-webhook-dialog";
import { WebhookDetailDrawer } from "@/features/settings/components/webhook-detail-drawer";

const EVENT_OVERFLOW_LIMIT = 2;

const STATUS_VARIANT: Record<WebhookStatus, "success" | "neutral" | "danger"> = {
  active: "success",
  disabled: "neutral",
  failing: "danger",
};

export default function WebhooksSettingsPage() {
  const { data, isLoading } = useWebhooksQuery();
  const setCreateWebhookOpen = useSettingsStore((state) => state.setCreateWebhookOpen);
  const openWebhookDetail = useSettingsStore((state) => state.openWebhookDetail);

  // Local optimistic override for the Disable/Enable action — no store
  // mutation infrastructure exists for webhooks, so this is intentionally
  // component-local and resets on remount/refetch.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, WebhookStatus>>({});

  function effectiveStatus(webhook: Webhook): WebhookStatus {
    return statusOverrides[webhook.id] ?? webhook.status;
  }

  function handleToggleEnabled(webhook: Webhook) {
    const next: WebhookStatus = effectiveStatus(webhook) === "active" ? "disabled" : "active";
    setStatusOverrides((prev) => ({ ...prev, [webhook.id]: next }));
    toast.success(next === "active" ? "Webhook enabled" : "Webhook disabled", {
      description: webhook.url,
    });
  }

  function handleSendTest() {
    const fakeRequest = new Promise<void>((resolve) => setTimeout(resolve, 500));
    toast.promise(fakeRequest, {
      loading: "Sending test event…",
      success: "Test event sent — 200 OK",
      error: "Test event failed",
    });
  }

  function handleDelete(webhook: Webhook) {
    toast.info("Deleting isn't wired to a backend yet", {
      description: `"${webhook.url}" was not deleted.`,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-muted-foreground max-w-2xl text-sm">
          Webhooks send real-time HTTP notifications to your own endpoint when events happen in your
          account — session lifecycle changes, tracking loss, generated reports, and more.
        </p>
        <Button onClick={() => setCreateWebhookOpen(true)}>Create webhook</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Endpoint</TableHead>
            <TableHead>Events</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                <TableCell colSpan={5}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : !data || data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="p-0">
                <EmptyState
                  icon={WebhookIcon}
                  title="No webhooks yet"
                  description="Create a webhook to start receiving event notifications."
                />
              </TableCell>
            </TableRow>
          ) : (
            data.map((webhook) => {
              const status = effectiveStatus(webhook);
              return (
                <TableRow
                  key={webhook.id}
                  className="cursor-pointer"
                  onClick={() => openWebhookDetail(webhook.id)}
                >
                  <TableCell className="max-w-xs">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-foreground truncate font-mono text-sm">
                        {webhook.url}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">
                        {webhook.description}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {webhook.events.slice(0, EVENT_OVERFLOW_LIMIT).map((event) => (
                        <Badge key={event} variant="outline" className="font-mono text-[11px]">
                          {event}
                        </Badge>
                      ))}
                      {webhook.events.length > EVENT_OVERFLOW_LIMIT && (
                        <Badge variant="neutral">
                          +{webhook.events.length - EVENT_OVERFLOW_LIMIT}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      {status === "failing" && (
                        <span className="relative flex size-2" aria-hidden="true">
                          <span className="bg-danger absolute inline-flex size-full animate-ping rounded-full opacity-75" />
                          <span className="bg-danger relative inline-flex size-2 rounded-full" />
                        </span>
                      )}
                      <Badge variant={STATUS_VARIANT[status]} className="capitalize">
                        {status}
                      </Badge>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatAbsoluteDate(webhook.createdAt)}
                  </TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu
                      placement="bottom-end"
                      trigger={
                        <button
                          type="button"
                          aria-label={`Actions for ${webhook.url}`}
                          className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-8 items-center justify-center rounded-md transition-colors duration-150 focus-visible:outline-none"
                        >
                          <MoreHorizontal className="size-4" strokeWidth={1.75} />
                        </button>
                      }
                    >
                      <DropdownMenuItem onSelect={() => openWebhookDetail(webhook.id)}>
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleSendTest()}>
                        Send test event
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleToggleEnabled(webhook)}>
                        {status === "active" ? "Disable" : "Enable"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => handleDelete(webhook)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <CreateWebhookDialog />
      <WebhookDetailDrawer />
    </div>
  );
}

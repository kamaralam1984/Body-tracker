"use client";

/**
 * Webhook detail view — mounted once (`<WebhookDetailDrawer />`), driven
 * entirely by `useSettingsStore`'s `webhookDetailId` rather than props, per
 * the established pattern in this codebase. Renders the webhook's full
 * details (secret always masked) plus its real seeded delivery log via
 * `useWebhookDeliveriesQuery`, rendered through the generic `DataTable`.
 *
 * <WebhookDetailDrawer />
 */

import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  formatAbsoluteDate,
  useSettingsStore,
  useWebhookDeliveriesQuery,
  useWebhooksQuery,
} from "@/features/settings";
import type { WebhookDelivery, WebhookDeliveryStatus, WebhookStatus } from "@/features/settings";

const STATUS_VARIANT: Record<WebhookStatus, "success" | "neutral" | "danger"> = {
  active: "success",
  disabled: "neutral",
  failing: "danger",
};

const DELIVERY_STATUS_VARIANT: Record<WebhookDeliveryStatus, "success" | "danger" | "warning"> = {
  success: "success",
  failed: "danger",
  pending: "warning",
};

function sendTestEvent() {
  const fakeRequest = new Promise<void>((resolve) => setTimeout(resolve, 500));
  toast.promise(fakeRequest, {
    loading: "Sending test event…",
    success: "Test event sent — 200 OK",
    error: "Test event failed",
  });
}

export function WebhookDetailDrawer() {
  const webhookDetailId = useSettingsStore((state) => state.webhookDetailId);
  const closeWebhookDetail = useSettingsStore((state) => state.closeWebhookDetail);
  const { data: webhooks } = useWebhooksQuery();
  const { data: deliveries, isLoading: deliveriesLoading } =
    useWebhookDeliveriesQuery(webhookDetailId);

  const webhook = webhooks?.find((w) => w.id === webhookDetailId) ?? null;

  const columns: DataTableColumn<WebhookDelivery>[] = [
    {
      key: "event",
      header: "Event",
      render: (delivery) => <span className="font-mono text-xs">{delivery.event}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (delivery) => (
        <Badge variant={DELIVERY_STATUS_VARIANT[delivery.status]} className="capitalize">
          {delivery.status}
        </Badge>
      ),
    },
    {
      key: "statusCode",
      header: "Status code",
      render: (delivery) => (
        <span
          className={cn(
            "text-sm tabular-nums",
            delivery.statusCode === null && "text-muted-foreground",
          )}
        >
          {delivery.statusCode ?? "—"}
        </span>
      ),
    },
    {
      key: "timestamp",
      header: "Time",
      sortable: true,
      sortValue: (delivery) => new Date(delivery.timestamp).getTime(),
      render: (delivery) => (
        <span className="text-muted-foreground text-sm">
          {formatAbsoluteDate(delivery.timestamp)}
        </span>
      ),
    },
    {
      key: "durationMs",
      header: "Duration",
      align: "right",
      sortable: true,
      sortValue: (delivery) => delivery.durationMs,
      render: (delivery) => <span className="text-sm tabular-nums">{delivery.durationMs}ms</span>,
    },
  ];

  return (
    <Drawer
      open={Boolean(webhookDetailId)}
      onClose={closeWebhookDetail}
      title="Webhook details"
      description={webhook?.url}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={closeWebhookDetail}>
            Close
          </Button>
          <Button onClick={() => sendTestEvent()} disabled={!webhook}>
            Send test event
          </Button>
        </>
      }
    >
      {webhook && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-sm font-medium">Status</span>
              <Badge variant={STATUS_VARIANT[webhook.status]} className="capitalize">
                {webhook.status}
              </Badge>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-sm font-medium">Endpoint URL</span>
              <code className="border-border bg-muted text-foreground truncate rounded-md border px-3 py-2 font-mono text-sm">
                {webhook.url}
              </code>
            </div>

            {webhook.description && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-sm font-medium">Description</span>
                <p className="text-foreground text-sm">{webhook.description}</p>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-sm font-medium">Signing secret</span>
              <code className="border-border bg-muted text-foreground rounded-md border px-3 py-2 font-mono text-sm">
                whsec_••••{webhook.secretLastFour}
              </code>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-sm font-medium">Subscribed events</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {webhook.events.map((event) => (
                  <Badge key={event} variant="outline" className="font-mono text-[11px]">
                    {event}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-sm font-medium">Created</span>
              <span className="text-foreground text-sm">
                {formatAbsoluteDate(webhook.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-foreground text-sm font-semibold">Delivery logs</span>
            <DataTable
              data={deliveries ?? []}
              columns={columns}
              getRowId={(delivery) => delivery.id}
              loading={deliveriesLoading}
              pageSize={8}
              emptyTitle="No deliveries yet"
              emptyDescription="This webhook hasn't received any event deliveries."
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}

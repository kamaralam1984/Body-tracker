import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/server/db/store";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody } from "@/server/http/validate";
import { notFound } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";
import { sanitizeWebhook } from "@/server/services/webhooks-service";

export const dynamic = "force-dynamic";

const webhookEventEnum = z.enum([
  "session.started",
  "session.completed",
  "tracking.form-alert",
  "report.ready",
  "user.invited",
]);

const patchSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(webhookEventEnum).min(1).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

function findWebhook(id: string, orgId: string) {
  const store = getStore();
  const webhook = store.webhooks.get(id);
  if (!webhook || webhook.orgId !== orgId) throw notFound("Webhook");
  return webhook;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "webhooks:read");

    const webhook = findWebhook(id, principal.orgId);

    return ok(sanitizeWebhook(webhook), { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "webhooks:write");

    const body = await parseJsonBody(request, patchSchema);

    const webhook = findWebhook(id, principal.orgId);

    if (body.url !== undefined) webhook.url = body.url;
    if (body.events !== undefined) webhook.events = body.events;
    if (body.status !== undefined) webhook.status = body.status;

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "webhook.updated",
      target: webhook.id,
      metadata: { url: body.url, events: body.events, status: body.status },
    });

    return ok(sanitizeWebhook(webhook), { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "webhooks:write");

    const webhook = findWebhook(id, principal.orgId);

    const store = getStore();
    store.webhooks.delete(webhook.id);
    for (const [deliveryId, delivery] of store.webhookDeliveries) {
      if (delivery.webhookId === webhook.id) store.webhookDeliveries.delete(deliveryId);
    }

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "webhook.deleted",
      target: webhook.id,
    });

    return ok({ deleted: true, id: webhook.id }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

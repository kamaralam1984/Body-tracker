import { NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { ApiError, badRequest, notFound } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";
import {
  buildSampleEventPayload,
  signPayload,
  toApiDelivery,
  toApiEvents,
  toPrismaEventType,
} from "@/server/services/webhooks-service";

export const dynamic = "force-dynamic";

const webhookEventEnum = z.enum([
  "session.started",
  "session.completed",
  "tracking.form-alert",
  "report.ready",
  "user.invited",
]);

export const testSchema = z.object({
  event: webhookEventEnum.optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "webhooks:write");

    const prisma = await getPrisma();
    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook || webhook.orgId !== principal.orgId) throw notFound("Webhook");

    // Body is optional — an empty/absent body just uses the webhook's first subscribed event.
    const rawRequestBody = await request.text();
    let parsedBody: z.infer<typeof testSchema> = {};
    if (rawRequestBody.length > 0) {
      let json: unknown;
      try {
        json = JSON.parse(rawRequestBody);
      } catch {
        throw new ApiError("bad_request", "Request body must be valid JSON");
      }
      const result = testSchema.safeParse(json);
      if (!result.success) {
        throw new ApiError(
          "validation_error",
          "Request body failed validation",
          result.error.flatten(),
        );
      }
      parsedBody = result.data;
    }

    const webhookEvents = toApiEvents(webhook.events);
    const event = parsedBody.event ?? webhookEvents[0];
    if (!event) throw badRequest("Webhook has no subscribed events to test");
    if (!webhookEvents.includes(event)) {
      throw badRequest(`Webhook is not subscribed to event "${event}"`);
    }

    const payload = buildSampleEventPayload(event, principal.orgId);
    const body = JSON.stringify(payload);
    const signature = signPayload(webhook.secret, body);

    let responseStatus: number | null = null;
    let deliverySucceeded = false;
    const startedAt = Date.now();
    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-BTK-Signature": `sha256=${signature}`,
          "X-BTK-Event": event,
        },
        body,
        signal: AbortSignal.timeout(5000),
      });
      responseStatus = response.status;
      deliverySucceeded = response.ok;
    } catch {
      // Network error, DNS failure, or timeout — a real and expected outcome
      // for a test delivery, not a bug in this endpoint.
      responseStatus = null;
      deliverySucceeded = false;
    }
    const durationMs = Date.now() - startedAt;

    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event: toPrismaEventType(event),
        payload: payload as Prisma.InputJsonValue,
        attempt: 1,
        status: deliverySucceeded ? "success" : "failed",
        responseStatus,
        durationMs,
      },
    });

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "webhook.test_delivery",
      target: webhook.id,
      metadata: { event, status: delivery.status, responseStatus },
    });

    return ok(toApiDelivery(delivery), { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

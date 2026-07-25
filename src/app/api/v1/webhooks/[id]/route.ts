import { NextRequest } from "next/server";
import { z } from "zod";
import type { PrismaClient, Webhook as PrismaWebhook } from "@prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody } from "@/server/http/validate";
import { notFound } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";
import { sanitizeWebhook, toPrismaEvents } from "@/server/services/webhooks-service";

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

async function findWebhook(
  prisma: PrismaClient,
  id: string,
  orgId: string,
): Promise<PrismaWebhook> {
  const webhook = await prisma.webhook.findUnique({ where: { id } });
  if (!webhook || webhook.orgId !== orgId) throw notFound("Webhook");
  return webhook;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "webhooks:read");

    const prisma = await getPrisma();
    const webhook = await findWebhook(prisma, id, principal.orgId);

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

    const prisma = await getPrisma();
    await findWebhook(prisma, id, principal.orgId);

    const webhook = await prisma.webhook.update({
      where: { id },
      data: {
        ...(body.url !== undefined ? { url: body.url } : {}),
        ...(body.events !== undefined ? { events: toPrismaEvents(body.events) } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    });

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

    const prisma = await getPrisma();
    const webhook = await findWebhook(prisma, id, principal.orgId);

    // WebhookDelivery rows cascade-delete via the schema's onDelete: Cascade
    // on the webhookId relation, so no separate cleanup pass is needed.
    await prisma.webhook.delete({ where: { id: webhook.id } });

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

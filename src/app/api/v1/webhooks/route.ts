import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore, newId, nowIso } from "@/server/db/store";
import type { Webhook } from "@/server/db/entities";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody, parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
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

const listQuerySchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const createSchema = z.object({
  url: z.string().url(),
  events: z.array(webhookEventEnum).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "webhooks:read");

    const query = parseQuery(request.nextUrl.searchParams, listQuerySchema);
    const store = getStore();
    const webhooks = [...store.webhooks.values()]
      .filter((webhook) => webhook.orgId === principal.orgId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(sanitizeWebhook);

    const page = paginate(webhooks, query.cursor, query.limit);

    return ok(page.items, {
      meta: { nextCursor: page.nextCursor, total: page.total },
      headers: rateLimitResponseHeaders(principal),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "webhooks:write");

    const body = await parseJsonBody(request, createSchema);

    const store = getStore();
    const webhook: Webhook = {
      id: newId("wh"),
      orgId: principal.orgId,
      url: body.url,
      secret: randomBytes(24).toString("hex"),
      events: body.events,
      status: "active",
      createdAt: nowIso(),
    };
    store.webhooks.set(webhook.id, webhook);

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "webhook.created",
      target: webhook.id,
      metadata: { url: webhook.url, events: webhook.events },
    });

    // The secret is only ever returned in full at creation time; subsequent
    // reads always go through sanitizeWebhook().
    return ok(webhook, { status: 201, headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

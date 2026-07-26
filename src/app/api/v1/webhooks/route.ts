import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody, parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { parseSort, searchWhere } from "@/server/http/sort";
import { writeAudit } from "@/server/http/audit";
import { sanitizeWebhook, toPrismaEvents } from "@/server/services/webhooks-service";

export const dynamic = "force-dynamic";

const SORTABLE_FIELDS = ["url", "status", "createdAt"] as const;
const SEARCHABLE_FIELDS = ["url"] as const;

const webhookEventEnum = z.enum([
  "session.started",
  "session.completed",
  "tracking.form-alert",
  "report.ready",
  "user.invited",
]);

export const listQuerySchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.string().optional(),
  search: z.string().min(1).optional(),
});

export const createSchema = z.object({
  url: z.string().url(),
  events: z.array(webhookEventEnum).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "webhooks:read");

    const query = parseQuery(request.nextUrl.searchParams, listQuerySchema);
    const prisma = await getPrisma();
    const orderBy = parseSort(query.sort, SORTABLE_FIELDS);
    const webhooks = (
      await prisma.webhook.findMany({
        where: { orgId: principal.orgId, ...searchWhere(query.search, SEARCHABLE_FIELDS) },
        orderBy: orderBy.length > 0 ? orderBy : { createdAt: "asc" },
      })
    ).map(sanitizeWebhook);

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

    const prisma = await getPrisma();
    const webhook = await prisma.webhook.create({
      data: {
        orgId: principal.orgId,
        url: body.url,
        secret: randomBytes(24).toString("hex"),
        events: toPrismaEvents(body.events),
        status: "active",
      },
    });

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "webhook.created",
      target: webhook.id,
      metadata: { url: webhook.url, events: body.events },
    });

    // The secret is only ever returned in full at creation time; subsequent
    // reads always go through sanitizeWebhook(). `events` is overridden with
    // the already-validated app-facing strings rather than re-mapped from
    // the Prisma enum, since they're equivalent and this preserves order.
    return ok(
      { ...webhook, events: body.events },
      { status: 201, headers: rateLimitResponseHeaders(principal) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

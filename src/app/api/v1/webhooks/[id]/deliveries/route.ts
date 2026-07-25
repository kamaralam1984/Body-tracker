import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/server/db/store";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { notFound } from "@/server/http/errors";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "webhooks:read");

    const store = getStore();
    const webhook = store.webhooks.get(id);
    if (!webhook || webhook.orgId !== principal.orgId) throw notFound("Webhook");

    const query = parseQuery(request.nextUrl.searchParams, listQuerySchema);
    const deliveries = [...store.webhookDeliveries.values()]
      .filter((delivery) => delivery.webhookId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const page = paginate(deliveries, query.cursor, query.limit);

    return ok(page.items, {
      meta: { nextCursor: page.nextCursor, total: page.total },
      headers: rateLimitResponseHeaders(principal),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

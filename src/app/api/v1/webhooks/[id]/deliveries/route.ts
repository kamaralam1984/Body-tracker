import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { notFound } from "@/server/http/errors";
import { toApiDelivery } from "@/server/services/webhooks-service";

export const dynamic = "force-dynamic";

export const listQuerySchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "webhooks:read");

    const prisma = await getPrisma();
    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook || webhook.orgId !== principal.orgId) throw notFound("Webhook");

    const query = parseQuery(request.nextUrl.searchParams, listQuerySchema);
    const deliveries = (
      await prisma.webhookDelivery.findMany({
        where: { webhookId: id },
        orderBy: { createdAt: "desc" },
      })
    ).map(toApiDelivery);

    const page = paginate(deliveries, query.cursor, query.limit);

    return ok(page.items, {
      meta: { nextCursor: page.nextCursor, total: page.total },
      headers: rateLimitResponseHeaders(principal),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

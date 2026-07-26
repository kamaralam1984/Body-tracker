import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";

export const dynamic = "force-dynamic";

export const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});

/**
 * Real personal notifications — inherently self-scoped by `userId` (never
 * `orgId`), so this deliberately skips `requireScope()` the way every other
 * route in this API does: a notification is only ever visible to the
 * human it was written for, so there's no broader permission to check
 * (same reasoning as why `/api/v1/users/me` doesn't need an `:id` param).
 */
export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    const { cursor, limit, unreadOnly } = parseQuery(request.nextUrl.searchParams, listQuerySchema);

    const prisma = await getPrisma();
    const [all, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: principal.userId, ...(unreadOnly ? { read: false } : {}) },
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where: { userId: principal.userId, read: false } }),
    ]);

    const { items, nextCursor, total } = paginate(all, cursor, limit);
    return ok(
      { items, nextCursor, total, unreadCount },
      { headers: rateLimitResponseHeaders(principal) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

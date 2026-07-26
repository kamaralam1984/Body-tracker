import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { notFound } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";

export const dynamic = "force-dynamic";

export const patchSchema = z.object({
  read: z.boolean(),
});

/** Marks a single notification read/unread — 404s (not 403s) on someone else's notification, same as every other ownership check in this API, so existence isn't leaked across users. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await resolvePrincipal(request);
    const { id } = await params;
    const body = await parseJsonBody(request, patchSchema);

    const prisma = await getPrisma();
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== principal.userId) throw notFound("Notification");

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: body.read },
    });

    return ok(notification, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

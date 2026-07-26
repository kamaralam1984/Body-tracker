import { NextRequest } from "next/server";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";

export const dynamic = "force-dynamic";

/** Marks every one of the caller's own unread notifications as read. */
export async function POST(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    const prisma = await getPrisma();
    const { count } = await prisma.notification.updateMany({
      where: { userId: principal.userId, read: false },
      data: { read: true },
    });
    return ok({ updated: count }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

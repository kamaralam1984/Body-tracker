import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody } from "@/server/http/validate";
import { notFound } from "@/server/http/errors";
import { sanitizeUser } from "@/server/services/auth-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "users:read");
    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({ where: { id: principal.userId } });
    if (!user) throw notFound("User");
    return ok(sanitizeUser(user), { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "users:write");
    const body = await parseJsonBody(request, updateMeSchema);
    const prisma = await getPrisma();
    const existing = await prisma.user.findUnique({ where: { id: principal.userId } });
    if (!existing) throw notFound("User");
    const user = await prisma.user.update({
      where: { id: principal.userId },
      data: { name: body.name ?? existing.name },
    });
    return ok(sanitizeUser(user), { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

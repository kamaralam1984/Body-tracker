import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/server/db/store";
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
    const store = getStore();
    const user = store.users.get(principal.userId);
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
    const store = getStore();
    const user = store.users.get(principal.userId);
    if (!user) throw notFound("User");
    if (body.name !== undefined) user.name = body.name;
    return ok(sanitizeUser(user), { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

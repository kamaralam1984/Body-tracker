import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore, newId, nowIso } from "@/server/db/store";
import { hashPassword } from "@/server/auth/password";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody, parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { forbidden, conflict } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";
import { sanitizeUser } from "@/server/services/organizations-service";
import type { Role, User } from "@/server/db/entities";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const roleEnum = z.enum(["owner", "admin", "manager", "member", "viewer"]);

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: roleEnum,
  teamId: z.string().nullable().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "users:read");
    if (id !== principal.orgId) throw forbidden("Cannot access another organization");

    const query = parseQuery(request.nextUrl.searchParams, listQuerySchema);
    const store = getStore();
    const members = [...store.users.values()]
      .filter((user) => user.orgId === id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(sanitizeUser);

    const page = paginate(members, query.cursor, query.limit);

    return ok(page.items, {
      meta: { nextCursor: page.nextCursor, total: page.total },
      headers: rateLimitResponseHeaders(principal),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "organizations:write");
    if (id !== principal.orgId) throw forbidden("Cannot access another organization");

    const body = await parseJsonBody(request, createSchema);

    const store = getStore();
    const existing = [...store.users.values()].find(
      (user) => user.orgId === id && user.email.toLowerCase() === body.email.toLowerCase(),
    );
    if (existing) throw conflict("A member with this email already exists in the organization");

    const tempSecret = randomBytes(24).toString("hex");
    const user: User = {
      id: newId("user"),
      orgId: id,
      teamId: body.teamId ?? null,
      email: body.email,
      passwordHash: hashPassword(tempSecret),
      name: body.name,
      role: body.role as Role,
      status: "invited",
      createdAt: nowIso(),
    };
    store.users.set(user.id, user);

    writeAudit({
      orgId: id,
      actorId: principal.userId,
      action: "org.member_invited",
      target: user.id,
      metadata: { email: user.email, role: user.role },
    });

    return ok(sanitizeUser(user), { status: 201, headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

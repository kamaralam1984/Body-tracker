import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody, parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { parseSort, searchWhere } from "@/server/http/sort";
import { writeAudit } from "@/server/http/audit";
import { generateClientCredentials } from "@/server/services/oauth-service";
import { ALL_SCOPES, type Scope } from "@/server/db/entities";

export const dynamic = "force-dynamic";

const SORTABLE_FIELDS = ["name", "createdAt"] as const;
const SEARCHABLE_FIELDS = ["name"] as const;

export const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  search: z.string().min(1).optional(),
});

export const createSchema = z.object({
  name: z.string().min(1),
  redirectUris: z.array(z.string().url()).min(1),
  scopes: z
    .array(z.string())
    .min(1)
    .refine((arr) => arr.every((s) => (ALL_SCOPES as string[]).includes(s)), {
      message: `scopes must only contain values from: ${ALL_SCOPES.join(", ")}`,
    }),
});

function sanitizeClient<T extends { clientSecretHash: string }>(
  client: T,
): Omit<T, "clientSecretHash"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally dropping the secret hash
  const { clientSecretHash, ...rest } = client;
  return rest;
}

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "oauth-clients:read");

    const { cursor, limit, sort, search } = parseQuery(
      request.nextUrl.searchParams,
      listQuerySchema,
    );
    const prisma = await getPrisma();
    const orderBy = parseSort(sort, SORTABLE_FIELDS);
    const clients = (
      await prisma.oAuthClient.findMany({
        where: { orgId: principal.orgId, ...searchWhere(search, SEARCHABLE_FIELDS) },
        orderBy: orderBy.length > 0 ? orderBy : { createdAt: "desc" },
      })
    ).map(sanitizeClient);

    const page = paginate(clients, cursor, limit);
    return ok(
      { items: page.items, nextCursor: page.nextCursor, total: page.total },
      { headers: rateLimitResponseHeaders(principal) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "oauth-clients:write");

    const body = await parseJsonBody(request, createSchema);
    const prisma = await getPrisma();
    const { clientId, clientSecret, clientSecretHash } = generateClientCredentials();

    const client = await prisma.oAuthClient.create({
      data: {
        orgId: principal.orgId,
        name: body.name,
        clientId,
        clientSecretHash,
        redirectUris: body.redirectUris,
        scopes: body.scopes as Scope[],
      },
    });

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "oauth-client.created",
      target: client.id,
      metadata: { name: client.name },
    });

    // clientSecret is only ever returned in full here, at creation time —
    // same discipline as api-keys' plaintext-once-on-create.
    return ok(
      { ...sanitizeClient(client), clientSecret },
      { status: 201, headers: rateLimitResponseHeaders(principal) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

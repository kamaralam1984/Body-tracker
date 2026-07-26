import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { badRequest } from "@/server/http/errors";
import { parseJsonBody, parseQuery } from "@/server/http/validate";
import { beginRequestContext } from "@/server/http/request-context";
import { createAuthorizationCode } from "@/server/services/oauth-service";
import type { Scope } from "@/server/db/entities";

export const dynamic = "force-dynamic";

export const authorizeQuerySchema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: z.string().min(1),
  state: z.string().optional(),
  code_challenge: z.string().min(1),
  code_challenge_method: z.literal("S256"),
});

export const authorizeDecisionSchema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: z.string().min(1),
  state: z.string().optional(),
  code_challenge: z.string().min(1),
  code_challenge_method: z.literal("S256"),
  approve: z.boolean(),
});

/** Real, public (unauthenticated) client lookup — the consent page calls this before the user is even asked to log in, so it can show "App X wants access to..." up front. */
export async function GET(request: NextRequest) {
  try {
    beginRequestContext(request);
    const query = parseQuery(request.nextUrl.searchParams, authorizeQuerySchema);

    const prisma = await getPrisma();
    const client = await prisma.oAuthClient.findUnique({ where: { clientId: query.client_id } });
    if (!client) throw badRequest("Unknown client_id");
    if (!client.redirectUris.includes(query.redirect_uri)) {
      throw badRequest("redirect_uri is not registered for this client");
    }

    const requestedScopes = query.scope.split(" ").filter(Boolean);
    const grantableScopes = requestedScopes.filter((s) => client.scopes.includes(s));

    return ok({
      clientName: client.name,
      requestedScopes,
      grantableScopes,
      ungrantableScopes: requestedScopes.filter((s) => !grantableScopes.includes(s)),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/** The real consent decision — called by the logged-in user's browser after they click Approve/Deny on the consent page. */
export async function POST(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    const body = await parseJsonBody(request, authorizeDecisionSchema);

    const redirectUrl = new URL(body.redirect_uri);
    if (body.state) redirectUrl.searchParams.set("state", body.state);

    if (!body.approve) {
      redirectUrl.searchParams.set("error", "access_denied");
      return ok({ redirectTo: redirectUrl.toString() });
    }

    const prisma = await getPrisma();
    const client = await prisma.oAuthClient.findUnique({ where: { clientId: body.client_id } });
    if (!client) throw badRequest("Unknown client_id");
    if (!client.redirectUris.includes(body.redirect_uri)) {
      throw badRequest("redirect_uri is not registered for this client");
    }

    // Real triple intersection: only scopes the CLIENT is registered for,
    // AND the approving USER actually has, are ever granted — a member
    // can't consent to handing a third party permissions they don't have
    // themselves, even if the client asks for them.
    const requestedScopes = body.scope.split(" ").filter(Boolean);
    const grantedScopes = requestedScopes.filter(
      (s) => client.scopes.includes(s) && principal.scopes.includes(s as Scope),
    );
    if (grantedScopes.length === 0) {
      throw badRequest("None of the requested scopes can be granted to this client for this user");
    }

    const code = await createAuthorizationCode({
      clientDbId: client.id,
      userId: principal.userId,
      redirectUri: body.redirect_uri,
      scopes: grantedScopes,
      codeChallenge: body.code_challenge,
      codeChallengeMethod: body.code_challenge_method,
    });

    redirectUrl.searchParams.set("code", code);
    return ok({ redirectTo: redirectUrl.toString(), grantedScopes });
  } catch (error) {
    return errorResponse(error);
  }
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/server/http/respond";
import { badRequest } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { beginRequestContext } from "@/server/http/request-context";
import { exchangeAuthorizationCode, refreshOAuthToken } from "@/server/services/oauth-service";

export const dynamic = "force-dynamic";

const authorizationCodeGrantSchema = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string().min(1),
  client_id: z.string().min(1),
  client_secret: z.string().optional(),
  redirect_uri: z.string().url(),
  code_verifier: z.string().min(1),
});

const refreshTokenGrantSchema = z.object({
  grant_type: z.literal("refresh_token"),
  refresh_token: z.string().min(1),
});

export const tokenGrantSchema = z.discriminatedUnion("grant_type", [
  authorizationCodeGrantSchema,
  refreshTokenGrantSchema,
]);

/** RFC 6749 token endpoint — no Bearer/API-key auth on this route itself (the client authenticates via client_id/client_secret or the refresh token in the body, the standard OAuth2 token-endpoint pattern). */
export async function POST(request: NextRequest) {
  try {
    beginRequestContext(request);
    const body = await parseJsonBody(request, tokenGrantSchema);

    if (body.grant_type === "authorization_code") {
      const result = await exchangeAuthorizationCode({
        code: body.code,
        clientId: body.client_id,
        clientSecret: body.client_secret,
        redirectUri: body.redirect_uri,
        codeVerifier: body.code_verifier,
      });
      return ok({ ...result, tokenType: "Bearer" }, { status: 200 });
    }

    if (body.grant_type === "refresh_token") {
      const result = await refreshOAuthToken(body.refresh_token);
      return ok({ ...result, tokenType: "Bearer" }, { status: 200 });
    }

    throw badRequest("Unsupported grant_type");
  } catch (error) {
    return errorResponse(error);
  }
}

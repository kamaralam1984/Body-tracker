import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getPrisma } from "@/server/db/prisma";
import { hashApiKey } from "@/server/auth/api-keys";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/server/auth/tokens";
import { badRequest, unauthorized } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";

/**
 * Business logic for this app acting as its own OAuth2 provider (RFC 6749
 * authorization-code grant + RFC 7636 PKCE) — third-party apps register a
 * client, redirect a user through `/oauth/authorize` (the real consent
 * page at `src/app/oauth/authorize/page.tsx`), and exchange the resulting
 * code here for the same real JWT access/refresh tokens
 * `src/server/services/auth-service.ts` issues on normal login, just
 * restricted to the scopes the user actually consented to.
 */

const AUTH_CODE_TTL_MS = 10 * 60 * 1000;

export function generateClientCredentials(): {
  clientId: string;
  clientSecret: string;
  clientSecretHash: string;
} {
  const clientId = `btk_client_${randomBytes(12).toString("hex")}`;
  const clientSecret = `btk_secret_${randomBytes(24).toString("hex")}`;
  return { clientId, clientSecret, clientSecretHash: hashApiKey(clientSecret) };
}

function generateAuthorizationCode(): { code: string; codeHash: string } {
  const code = `btk_code_${randomBytes(24).toString("hex")}`;
  return { code, codeHash: hashApiKey(code) };
}

/** RFC 7636 PKCE verification — S256 only (the modern, recommended method; "plain" is deliberately not supported). */
export function verifyPkce(codeVerifier: string, codeChallenge: string, method: string): boolean {
  if (method !== "S256") return false;
  const hash = createHash("sha256").update(codeVerifier).digest("base64url");
  return hash === codeChallenge;
}

export interface OAuthTokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
}

/** Creates a real, single-use, 10-minute authorization code after the user approves consent. Caller (the `/oauth/authorize` POST route) has already verified the user is authenticated and the client/redirect_uri/scopes are all valid. */
export async function createAuthorizationCode(input: {
  clientDbId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge: string;
  codeChallengeMethod: string;
}): Promise<string> {
  const prisma = await getPrisma();
  const { code, codeHash } = generateAuthorizationCode();

  await prisma.oAuthAuthorizationCode.create({
    data: {
      codeHash,
      clientId: input.clientDbId,
      userId: input.userId,
      redirectUri: input.redirectUri,
      scopes: input.scopes,
      codeChallenge: input.codeChallenge,
      codeChallengeMethod: input.codeChallengeMethod,
      used: false,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
    },
  });

  return code;
}

/** `grant_type=authorization_code` — validates the code, PKCE verifier, and redirect_uri, then issues real scoped tokens. */
export async function exchangeAuthorizationCode(input: {
  code: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<OAuthTokenResult> {
  const prisma = await getPrisma();

  const client = await prisma.oAuthClient.findUnique({ where: { clientId: input.clientId } });
  if (!client) throw unauthorized("Unknown client_id");
  if (input.clientSecret && hashApiKey(input.clientSecret) !== client.clientSecretHash) {
    throw unauthorized("Invalid client_secret");
  }

  const codeHash = hashApiKey(input.code);
  const authCode = await prisma.oAuthAuthorizationCode.findUnique({ where: { codeHash } });
  if (!authCode || authCode.clientId !== client.id) throw badRequest("Invalid authorization code");
  if (authCode.used) throw badRequest("Authorization code has already been used");
  if (authCode.expiresAt.getTime() < Date.now()) throw badRequest("Authorization code has expired");
  if (authCode.redirectUri !== input.redirectUri) throw badRequest("redirect_uri does not match");
  if (!verifyPkce(input.codeVerifier, authCode.codeChallenge, authCode.codeChallengeMethod)) {
    throw badRequest("Invalid code_verifier");
  }

  // Single-use: mark before issuing tokens, so a code can never be
  // exchanged twice even if something below this line were to fail.
  await prisma.oAuthAuthorizationCode.update({ where: { id: authCode.id }, data: { used: true } });

  const user = await prisma.user.findUnique({ where: { id: authCode.userId } });
  if (!user) throw unauthorized("Authorization code subject no longer exists");

  const accessToken = signAccessToken({
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
    scopes: authCode.scopes,
    oauthClientId: client.id,
  });

  const jti = randomUUID();
  const refreshToken = signRefreshToken({ userId: user.id, jti });
  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId: user.id,
      tokenHash: hashApiKey(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      revokedAt: null,
      scopes: authCode.scopes,
      oauthClientId: client.id,
    },
  });

  writeAudit({
    orgId: user.orgId,
    actorId: user.id,
    action: "oauth.token_issued",
    target: `oauth-client:${client.id}`,
    metadata: { scopes: authCode.scopes },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    scope: authCode.scopes.join(" "),
  };
}

/** `grant_type=refresh_token` for an OAuth-issued refresh token — rotates it and re-signs an access token with the SAME consented scopes, never the user's full role scopes. */
export async function refreshOAuthToken(refreshTokenInput: string): Promise<OAuthTokenResult> {
  const payload = verifyRefreshToken(refreshTokenInput);
  if (!payload) throw unauthorized("Invalid or expired refresh token");

  const prisma = await getPrisma();
  const record = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
  const tokenHash = hashApiKey(refreshTokenInput);
  if (!record || record.revokedAt || record.tokenHash !== tokenHash) {
    throw unauthorized("Invalid or expired refresh token");
  }
  if (record.expiresAt.getTime() < Date.now())
    throw unauthorized("Invalid or expired refresh token");
  if (!record.oauthClientId) {
    throw badRequest("Not an OAuth-issued refresh token — use /api/v1/auth/refresh instead");
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) throw unauthorized("Token subject not found");

  await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });

  const jti = randomUUID();
  const newRefreshToken = signRefreshToken({ userId: user.id, jti });
  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId: user.id,
      tokenHash: hashApiKey(newRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      revokedAt: null,
      scopes: record.scopes,
      oauthClientId: record.oauthClientId,
    },
  });

  const accessToken = signAccessToken({
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
    scopes: record.scopes,
    oauthClientId: record.oauthClientId,
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    scope: record.scopes.join(" "),
  };
}

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A compact JWT-compatible (HS256) access/refresh token implementation built
 * on Node's built-in `crypto` module — genuinely signed and verified, not a
 * mock. Standing in for a real JWT library since this project adds no new
 * npm dependencies; the wire format (`header.payload.signature`, base64url,
 * HMAC-SHA256) is the actual JWT spec, so it's interoperable with any real
 * JWT verifier given the same secret.
 */

const SECRET = process.env.BTK_JWT_SECRET ?? "dev-only-insecure-secret-change-in-production";

export interface AccessTokenPayload {
  sub: string; // userId
  orgId: string;
  role: string;
  type: "access";
  iat: number;
  exp: number;
  // Present only on tokens issued via the OAuth2 flow (src/app/api/v1/oauth/token/route.ts) —
  // restricts the token to the scopes the user actually consented to,
  // instead of the full role-based scope set a normal login token gets.
  // See resolvePrincipal()'s Bearer branch in src/server/http/principal.ts.
  scopes?: string[];
  oauthClientId?: string;
}

export interface RefreshTokenPayload {
  sub: string;
  type: "refresh";
  jti: string;
  iat: number;
  exp: number;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

function sign(headerAndPayload: string): string {
  return base64url(createHmac("sha256", SECRET).update(headerAndPayload).digest());
}

function encode(payload: object): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function decode<T>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export function signAccessToken(input: {
  userId: string;
  orgId: string;
  role: string;
  scopes?: string[];
  oauthClientId?: string;
}): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload: AccessTokenPayload = {
    sub: input.userId,
    orgId: input.orgId,
    role: input.role,
    type: "access",
    iat,
    exp: iat + ACCESS_TOKEN_TTL_SECONDS,
    ...(input.scopes ? { scopes: input.scopes } : {}),
    ...(input.oauthClientId ? { oauthClientId: input.oauthClientId } : {}),
  };
  return encode(payload);
}

export function signRefreshToken(input: { userId: string; jti: string }): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload: RefreshTokenPayload = {
    sub: input.userId,
    type: "refresh",
    jti: input.jti,
    iat,
    exp: iat + REFRESH_TOKEN_TTL_SECONDS,
  };
  return encode(payload);
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  const payload = decode<AccessTokenPayload>(token);
  if (!payload || payload.type !== "access") return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  const payload = decode<RefreshTokenPayload>(token);
  if (!payload || payload.type !== "refresh") return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS };

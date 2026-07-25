import { getPrisma } from "@/server/db/prisma";
import { hashApiKey } from "@/server/auth/api-keys";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/server/auth/tokens";
import { verifyPassword } from "@/server/auth/password";
import { unauthorized } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";
import type { User as PrismaUser, ApiKey as PrismaApiKey } from "@prisma/client";

/**
 * Business logic shared by the auth/users/api-keys routes: login, refresh
 * rotation, logout, and the sanitization helpers that strip secrets
 * (passwordHash / keyHash) before a record ever reaches a response body.
 * Backed by the real Neon Postgres database via Prisma — types are derived
 * from the generated Prisma client, the real ground truth now, rather than
 * the hand-written src/server/db/entities.ts (which used ISO date strings
 * to match the old in-memory store; Prisma returns real Date objects, and
 * NextResponse.json() serializes those to the same ISO strings on the
 * wire, so the HTTP contract is unchanged).
 */

export type SanitizedUser = Omit<PrismaUser, "passwordHash">;
export type SanitizedApiKey = Omit<PrismaApiKey, "keyHash">;

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: SanitizedUser;
}

export function sanitizeUser<T extends { passwordHash: string }>(user: T): Omit<T, "passwordHash"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally dropping the secret field
  const { passwordHash, ...rest } = user;
  return rest;
}

export function sanitizeApiKey<T extends { keyHash: string }>(key: T): Omit<T, "keyHash"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally dropping the secret field
  const { keyHash, ...rest } = key;
  return rest;
}

function refreshExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
}

async function issueRefreshToken(userId: string): Promise<string> {
  const prisma = await getPrisma();
  const jti = crypto.randomUUID();
  const token = signRefreshToken({ userId, jti });
  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId,
      tokenHash: hashApiKey(token),
      expiresAt: refreshExpiry(),
      revokedAt: null,
    },
  });
  return token;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const prisma = await getPrisma();
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
  });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw unauthorized("Invalid email or password");
  }

  const refreshToken = await issueRefreshToken(user.id);
  const accessToken = signAccessToken({ userId: user.id, orgId: user.orgId, role: user.role });

  writeAudit({
    orgId: user.orgId,
    actorId: user.id,
    action: "auth.login",
    target: `user:${user.id}`,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: sanitizeUser(user),
  };
}

export async function refreshSession(refreshTokenInput: string): Promise<AuthResult> {
  const prisma = await getPrisma();
  const payload = verifyRefreshToken(refreshTokenInput);
  if (!payload) throw unauthorized("Invalid or expired refresh token");

  const record = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
  const tokenHash = hashApiKey(refreshTokenInput);
  if (!record || record.revokedAt || record.tokenHash !== tokenHash) {
    throw unauthorized("Invalid or expired refresh token");
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw unauthorized("Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw unauthorized("Token subject not found");

  // Rotate: revoke the presented token and issue a brand new pair.
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
  const newRefreshToken = await issueRefreshToken(user.id);
  const accessToken = signAccessToken({ userId: user.id, orgId: user.orgId, role: user.role });

  writeAudit({
    orgId: user.orgId,
    actorId: user.id,
    action: "auth.refresh",
    target: `user:${user.id}`,
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: sanitizeUser(user),
  };
}

export async function logout(refreshTokenInput: string): Promise<{ success: true }> {
  const prisma = await getPrisma();
  const payload = verifyRefreshToken(refreshTokenInput);
  if (!payload) return { success: true };

  const record = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
  if (record && !record.revokedAt) {
    await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (user) {
      writeAudit({
        orgId: user.orgId,
        actorId: user.id,
        action: "auth.logout",
        target: `user:${user.id}`,
      });
    }
  }

  return { success: true };
}

import { getStore, newId, nowIso } from "@/server/db/store";
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
import type { ApiKey, RefreshToken, User } from "@/server/db/entities";

/**
 * Business logic shared by the auth/users/api-keys routes: login, refresh
 * rotation, logout, and the sanitization helpers that strip secrets
 * (passwordHash / keyHash) before a record ever reaches a response body.
 */

export type SanitizedUser = Omit<User, "passwordHash">;
export type SanitizedApiKey = Omit<ApiKey, "keyHash">;

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: SanitizedUser;
}

export function sanitizeUser(user: User): SanitizedUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally dropping the secret field
  const { passwordHash, ...rest } = user;
  return rest;
}

export function sanitizeApiKey(key: ApiKey): SanitizedApiKey {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally dropping the secret field
  const { keyHash, ...rest } = key;
  return rest;
}

function refreshExpiryIso(): string {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString();
}

function issueRefreshToken(userId: string): { token: string; record: RefreshToken } {
  const store = getStore();
  const jti = newId("rt");
  const token = signRefreshToken({ userId, jti });
  const record: RefreshToken = {
    id: jti,
    userId,
    tokenHash: hashApiKey(token),
    createdAt: nowIso(),
    expiresAt: refreshExpiryIso(),
    revokedAt: null,
  };
  store.refreshTokens.set(record.id, record);
  return { token, record };
}

export function login(email: string, password: string): AuthResult {
  const store = getStore();
  const normalizedEmail = email.trim().toLowerCase();
  const user = [...store.users.values()].find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw unauthorized("Invalid email or password");
  }

  const { token: refreshToken } = issueRefreshToken(user.id);
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

export function refreshSession(refreshTokenInput: string): AuthResult {
  const store = getStore();
  const payload = verifyRefreshToken(refreshTokenInput);
  if (!payload) throw unauthorized("Invalid or expired refresh token");

  const record = store.refreshTokens.get(payload.jti);
  const tokenHash = hashApiKey(refreshTokenInput);
  if (!record || record.revokedAt || record.tokenHash !== tokenHash) {
    throw unauthorized("Invalid or expired refresh token");
  }
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    throw unauthorized("Invalid or expired refresh token");
  }

  const user = store.users.get(payload.sub);
  if (!user) throw unauthorized("Token subject not found");

  // Rotate: revoke the presented token and issue a brand new pair.
  record.revokedAt = nowIso();
  const { token: newRefreshToken } = issueRefreshToken(user.id);
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

export function logout(refreshTokenInput: string): { success: true } {
  const store = getStore();
  const payload = verifyRefreshToken(refreshTokenInput);
  if (!payload) return { success: true };

  const record = store.refreshTokens.get(payload.jti);
  if (record && !record.revokedAt) {
    record.revokedAt = nowIso();
    const user = store.users.get(record.userId);
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

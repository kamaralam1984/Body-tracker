import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { logger } from "@/server/logging/logger";
import { sendEmail } from "@/server/notifications/email";

export type NotificationType =
  | "api_key.created"
  | "api_key.rotated"
  | "api_key.revoked"
  | "api_key.expiring_soon"
  | "api_key.permission_changed"
  | "api_key.failed_auth_spike"
  | "api_key.rate_limit_exceeded";

/**
 * Writes a real in-app notification for a specific human user, then fires
 * the (opt-in) email stub — never a fabricated "sent" confirmation, the
 * email side of this genuinely no-ops until `SMTP_URL` is configured (see
 * `src/server/notifications/email.ts`).
 *
 * Deliberately per-user, not per-org broadcast: every call site below
 * targets the actual human owner of the affected resource (an `ApiKey`'s
 * `userId`), never an org-wide admin blast. Service-account-owned keys
 * have no human owner — callers simply skip notifying when `userId` is
 * null, since there's no real recipient (the event still surfaces in the
 * Security Center's real-time queries).
 */
export async function notifyUser(params: {
  orgId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const prisma = await getPrisma();
  await prisma.notification.create({
    data: {
      orgId: params.orgId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true },
  });
  if (user) {
    await sendEmail({ to: user.email, subject: params.title, body: params.body }).catch((error) =>
      logger.error({ err: error }, "notifyUser: email send failed"),
    );
  }
}

const NEAR_EXPIRATION_DAYS = 7;

/**
 * Daily sweep (see the 24h interval in `src/instrumentation.ts`) — notifies
 * each active key's human owner once it's within `NEAR_EXPIRATION_DAYS` of
 * `expiresAt`. Dedupes against a notification already sent for the same
 * key within the last day, so re-running this sweep (or a slow deploy
 * restart) can't double-notify.
 */
export async function sweepNearExpirationApiKeys(): Promise<void> {
  const prisma = await getPrisma();
  const now = new Date();
  const nearExpirationBy = new Date(now.getTime() + NEAR_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
  const dedupeSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const keys = await prisma.apiKey.findMany({
    where: {
      status: "active",
      userId: { not: null },
      expiresAt: { gte: now, lt: nearExpirationBy },
    },
    select: { id: true, orgId: true, userId: true, name: true, expiresAt: true },
  });

  for (const key of keys) {
    if (!key.userId) continue;

    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        userId: key.userId,
        type: "api_key.expiring_soon",
        createdAt: { gte: dedupeSince },
        metadata: { path: ["apiKeyId"], equals: key.id },
      },
    });
    if (alreadyNotified) continue;

    await notifyUser({
      orgId: key.orgId,
      userId: key.userId,
      type: "api_key.expiring_soon",
      title: `API key "${key.name}" is expiring soon`,
      body: `Your API key "${key.name}" expires on ${key.expiresAt?.toISOString()}. Rotate it before then to avoid disruption.`,
      metadata: { apiKeyId: key.id, expiresAt: key.expiresAt?.toISOString() },
    });
  }
}

const SPIKE_WINDOW_MINUTES = 5;
const SPIKE_THRESHOLD = 5;
const RATE_LIMIT_THRESHOLD = 10;
const SECURITY_DEDUPE_MINUTES = 15;

/**
 * Real-time-ish security sweep (runs on the existing 60s interval in
 * `src/instrumentation.ts`) — groups recent `ApiRequestLog` rows by
 * `apiKeyId` to detect two real signals already captured by request
 * logging, no new instrumentation needed:
 *
 * - `api_key.failed_auth_spike`: >= SPIKE_THRESHOLD 401s in the last
 *   SPIKE_WINDOW_MINUTES minutes for one key.
 * - `api_key.rate_limit_exceeded`: >= RATE_LIMIT_THRESHOLD 429s in the
 *   same window.
 *
 * Dedupes per key+type within SECURITY_DEDUPE_MINUTES so a sustained spike
 * (or an attacker retrying for an hour) sends one notification per window,
 * not one every 60 seconds.
 */
export async function sweepSecurityNotifications(): Promise<void> {
  const prisma = await getPrisma();
  const now = new Date();
  const windowStart = new Date(now.getTime() - SPIKE_WINDOW_MINUTES * 60 * 1000);
  const dedupeSince = new Date(now.getTime() - SECURITY_DEDUPE_MINUTES * 60 * 1000);

  const [failedAuthGroups, rateLimitGroups] = await Promise.all([
    prisma.apiRequestLog.groupBy({
      by: ["apiKeyId"],
      where: { statusCode: 401, apiKeyId: { not: null }, createdAt: { gte: windowStart } },
      _count: { apiKeyId: true },
      having: { apiKeyId: { _count: { gte: SPIKE_THRESHOLD } } },
    }),
    prisma.apiRequestLog.groupBy({
      by: ["apiKeyId"],
      where: { statusCode: 429, apiKeyId: { not: null }, createdAt: { gte: windowStart } },
      _count: { apiKeyId: true },
      having: { apiKeyId: { _count: { gte: RATE_LIMIT_THRESHOLD } } },
    }),
  ]);

  async function notifyIfKeyOwned(
    apiKeyId: string | null,
    count: number,
    type: NotificationType,
    describe: (name: string) => { title: string; body: string },
  ) {
    if (!apiKeyId) return;
    const key = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      select: { id: true, orgId: true, userId: true, name: true },
    });
    if (!key?.userId) return;

    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        userId: key.userId,
        type,
        createdAt: { gte: dedupeSince },
        metadata: { path: ["apiKeyId"], equals: key.id },
      },
    });
    if (alreadyNotified) return;

    const { title, body } = describe(key.name);
    await notifyUser({
      orgId: key.orgId,
      userId: key.userId,
      type,
      title,
      body,
      metadata: { apiKeyId: key.id, count },
    });
  }

  for (const group of failedAuthGroups) {
    await notifyIfKeyOwned(
      group.apiKeyId,
      group._count.apiKeyId,
      "api_key.failed_auth_spike",
      (name) => ({
        title: `Failed authentication spike on "${name}"`,
        body: `${group._count.apiKeyId} failed authentication attempts against "${name}" in the last ${SPIKE_WINDOW_MINUTES} minutes. If this wasn't you, consider rotating or revoking this key.`,
      }),
    );
  }

  for (const group of rateLimitGroups) {
    await notifyIfKeyOwned(
      group.apiKeyId,
      group._count.apiKeyId,
      "api_key.rate_limit_exceeded",
      (name) => ({
        title: `Rate limit repeatedly exceeded on "${name}"`,
        body: `"${name}" hit its rate limit ${group._count.apiKeyId} times in the last ${SPIKE_WINDOW_MINUTES} minutes. Consider raising its limit or checking for a runaway integration.`,
      }),
    );
  }
}

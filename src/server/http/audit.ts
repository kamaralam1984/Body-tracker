import type { Prisma } from "@prisma/client";
import { getPrisma } from "../db/prisma";

/**
 * Fire-and-forget audit log write — callers don't await this (audit
 * logging shouldn't add latency or fail the request it's describing).
 * Errors are logged, never thrown.
 */
export function writeAudit(input: {
  orgId: string;
  actorId: string;
  action: string;
  target: string;
  metadata?: Record<string, unknown>;
}) {
  getPrisma()
    .then((prisma) =>
      prisma.auditLogEntry.create({
        data: {
          orgId: input.orgId,
          actorId: input.actorId,
          action: input.action,
          target: input.target,
          metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        },
      }),
    )
    .catch((error) => console.error("[audit] failed to write audit log entry", error));
}

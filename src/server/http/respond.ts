import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ApiError } from "./errors";
import { recordRequest } from "./metrics";
import { logApiRequest } from "./request-context";
import { logger } from "../logging/logger";

/**
 * Translates a real Prisma constraint violation into a clean 4xx instead
 * of a raw 500 — every route funnels through `errorResponse()`, so this
 * covers all of them, not just the one that surfaced it (a service-account
 * principal with `sessions:write`/`reports:write` granted hitting
 * TrackingSession.userId/Report.userId's real FK to User, since those
 * resources model "created by a human" and a ServiceAccount isn't one —
 * see the comment on the ServiceAccount model in prisma/schema.prisma).
 */
function translatePrismaError(error: Prisma.PrismaClientKnownRequestError): ApiError | null {
  if (error.code === "P2003") {
    return new ApiError(
      "bad_request",
      "This operation references a record that doesn't exist or isn't valid for this caller (e.g. a service account can't own a resource that requires a human user).",
    );
  }
  if (error.code === "P2002") {
    return new ApiError("conflict", "A record with this value already exists.");
  }
  return null;
}

export interface ApiMeta {
  traceId: string;
  [key: string]: unknown;
}

export function ok<T>(
  data: T,
  init?: { status?: number; meta?: Record<string, unknown>; headers?: HeadersInit },
) {
  const traceId = randomUUID();
  const status = init?.status ?? 200;
  recordRequest(status);
  logApiRequest(status);
  return NextResponse.json(
    { data, meta: { traceId, ...init?.meta } satisfies ApiMeta },
    { status, headers: init?.headers },
  );
}

export function errorResponse(error: unknown) {
  const traceId = randomUUID();

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const translated = translatePrismaError(error);
    if (translated) error = translated;
  }

  if (error instanceof ApiError) {
    recordRequest(error.status);
    logApiRequest(error.status);
    return NextResponse.json(
      {
        error: { code: error.code, message: error.message, details: error.details ?? null },
        meta: { traceId } satisfies ApiMeta,
      },
      { status: error.status },
    );
  }

  logger.error({ err: error, traceId }, "unhandled error");
  recordRequest(500);
  logApiRequest(500);
  return NextResponse.json(
    {
      error: { code: "internal_error", message: "An unexpected error occurred", details: null },
      meta: { traceId } satisfies ApiMeta,
    },
    { status: 500 },
  );
}

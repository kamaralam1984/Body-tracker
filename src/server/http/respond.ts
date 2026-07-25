import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ApiError } from "./errors";
import { recordRequest } from "./metrics";

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
  return NextResponse.json(
    { data, meta: { traceId, ...init?.meta } satisfies ApiMeta },
    { status, headers: init?.headers },
  );
}

export function errorResponse(error: unknown) {
  const traceId = randomUUID();
  if (error instanceof ApiError) {
    recordRequest(error.status);
    return NextResponse.json(
      {
        error: { code: error.code, message: error.message, details: error.details ?? null },
        meta: { traceId } satisfies ApiMeta,
      },
      { status: error.status },
    );
  }

  console.error(`[api] unhandled error trace=${traceId}`, error);
  recordRequest(500);
  return NextResponse.json(
    {
      error: { code: "internal_error", message: "An unexpected error occurred", details: null },
      meta: { traceId } satisfies ApiMeta,
    },
    { status: 500 },
  );
}

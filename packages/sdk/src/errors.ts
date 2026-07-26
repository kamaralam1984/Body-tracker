/**
 * Real error types mirroring the server's actual error envelope
 * (`src/server/http/respond.ts`'s `errorResponse()` — see the generated
 * `ApiErrorCode` union in `generated/error-codes.ts`). A caller can
 * `catch (error) { if (error instanceof KvlApiError) ... }` and branch on
 * `error.code` — the same 20+ specific codes (`invalid_api_key`,
 * `insufficient_scope`, `rate_limited`, `platform_admin_required`, etc.)
 * this API already returns, not a generic "request failed."
 */

import type { ApiErrorCode } from "./generated/error-codes";

export class KvlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KvlError";
  }
}

/** A real HTTP response came back with a non-2xx status and the server's real `{error: {code, message, details}}` envelope. */
export class KvlApiError extends KvlError {
  readonly code: ApiErrorCode | (string & {});
  readonly status: number;
  readonly details: unknown;
  readonly traceId?: string;

  constructor(params: {
    code: string;
    status: number;
    message: string;
    details?: unknown;
    traceId?: string;
  }) {
    super(params.message);
    this.name = "KvlApiError";
    this.code = params.code as ApiErrorCode;
    this.status = params.status;
    this.details = params.details;
    this.traceId = params.traceId;
  }
}

/** The request never got a response at all — DNS failure, connection refused, offline, aborted before completion. */
export class KvlNetworkError extends KvlError {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "KvlNetworkError";
    this.cause = cause;
  }
}

/** The request was aborted by `timeoutMs` — distinct from a caller-initiated `AbortController` abort (see `KvlAbortError`). */
export class KvlTimeoutError extends KvlError {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "KvlTimeoutError";
  }
}

/** The caller's own `AbortSignal` fired — not a timeout, not a network failure. */
export class KvlAbortError extends KvlError {
  constructor() {
    super("Request was aborted");
    this.name = "KvlAbortError";
  }
}

/** The circuit breaker is open (see `retry.ts`) — too many recent failures against this base URL, so this request was rejected without even attempting the network call. */
export class KvlCircuitOpenError extends KvlError {
  constructor(retryAfterMs: number) {
    super(`Circuit breaker is open — retry after ${retryAfterMs}ms`);
    this.name = "KvlCircuitOpenError";
  }
}

export function isKvlApiError(error: unknown): error is KvlApiError {
  return error instanceof KvlApiError;
}

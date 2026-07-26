export type ApiErrorCode =
  | "bad_request"
  | "validation_error"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "internal_error"
  // Specific auth-failure codes for API-key/Bearer authentication (see
  // resolvePrincipal() in src/server/http/principal.ts) — more diagnostic
  // than the generic "unauthorized"/"forbidden" above, so a real client
  // integration can branch on exactly what went wrong instead of just
  // getting a 401/403 with no further signal.
  | "invalid_api_key"
  | "expired_key"
  | "revoked_key"
  | "insufficient_scope"
  | "ip_not_allowed"
  | "invalid_origin"
  | "environment_mismatch"
  // Thrown by requirePlatformAdmin() (src/server/http/principal.ts) — the
  // caller authenticated fine, but isn't a platform admin, so none of the
  // cross-org /api/v1/platform/* routes are available to them.
  | "platform_admin_required";

// Exported (not just used internally) so the SDK's codegen script
// (scripts/generate-sdk-openapi-schema.mjs) can enumerate every real
// error code at runtime — a TS union type alone can't be introspected
// by a plain Node script, but this real, already-exhaustive runtime
// object can.
export const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  bad_request: 400,
  validation_error: 422,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  internal_error: 500,
  invalid_api_key: 401,
  expired_key: 401,
  revoked_key: 401,
  insufficient_scope: 403,
  ip_not_allowed: 403,
  invalid_origin: 403,
  environment_mismatch: 400,
  platform_admin_required: 403,
};

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export const notFound = (resource: string) => new ApiError("not_found", `${resource} not found`);
export const unauthorized = (message = "Authentication required") =>
  new ApiError("unauthorized", message);
export const forbidden = (message = "Insufficient permissions") =>
  new ApiError("forbidden", message);
export const conflict = (message: string) => new ApiError("conflict", message);
export const badRequest = (message: string) => new ApiError("bad_request", message);

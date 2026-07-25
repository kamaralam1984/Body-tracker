export type ApiErrorCode =
  | "bad_request"
  | "validation_error"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "internal_error";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  bad_request: 400,
  validation_error: 422,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  internal_error: 500,
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

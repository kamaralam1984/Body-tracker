import type { ZodType } from "zod";
import { ApiError } from "./errors";

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError("bad_request", "Request body must be valid JSON");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ApiError(
      "validation_error",
      "Request body failed validation",
      result.error.flatten(),
    );
  }
  return result.data;
}

export function parseQuery<T>(searchParams: URLSearchParams, schema: ZodType<T>): T {
  const obj = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(obj);
  if (!result.success) {
    throw new ApiError(
      "validation_error",
      "Query parameters failed validation",
      result.error.flatten(),
    );
  }
  return result.data;
}

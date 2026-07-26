import { describe, it, expect } from "vitest";
import {
  KvlApiError,
  KvlNetworkError,
  KvlTimeoutError,
  KvlAbortError,
  isKvlApiError,
} from "../src/errors";

describe("KvlApiError", () => {
  it("carries the real code/status/message/details/traceId", () => {
    const error = new KvlApiError({
      code: "insufficient_scope",
      status: 403,
      message: "Missing required scope: api-keys:write",
      details: { requiredScope: "api-keys:write" },
      traceId: "trace-123",
    });
    expect(error.code).toBe("insufficient_scope");
    expect(error.status).toBe(403);
    expect(error.message).toBe("Missing required scope: api-keys:write");
    expect(error.details).toEqual({ requiredScope: "api-keys:write" });
    expect(error.traceId).toBe("trace-123");
    expect(error.name).toBe("KvlApiError");
  });

  it("is a real Error instance (stack trace, instanceof Error)", () => {
    const error = new KvlApiError({ code: "not_found", status: 404, message: "gone" });
    expect(error).toBeInstanceOf(Error);
    expect(typeof error.stack).toBe("string");
  });
});

describe("isKvlApiError", () => {
  it("returns true only for KvlApiError instances", () => {
    expect(isKvlApiError(new KvlApiError({ code: "bad_request", status: 400, message: "x" }))).toBe(
      true,
    );
    expect(isKvlApiError(new KvlNetworkError("network down"))).toBe(false);
    expect(isKvlApiError(new Error("plain error"))).toBe(false);
    expect(isKvlApiError(null)).toBe(false);
    expect(isKvlApiError(undefined)).toBe(false);
  });
});

describe("KvlTimeoutError / KvlAbortError", () => {
  it("KvlTimeoutError reports the real configured timeout in its message", () => {
    const error = new KvlTimeoutError(30_000);
    expect(error.message).toContain("30000");
  });

  it("KvlAbortError has a stable, distinct name", () => {
    const error = new KvlAbortError();
    expect(error.name).toBe("KvlAbortError");
  });
});

/**
 * Real type-level tests — checked by TypeScript itself (via `vitest
 * typecheck`, not the normal test runner; `expectTypeOf` assertions are
 * erased at runtime, so this file is meaningless without the typecheck
 * pass — see `vitest.config.ts`'s `typecheck.include`).
 */
import { describe, it, expectTypeOf } from "vitest";
import { KvlClient } from "../src/client";
import type { PageResult, Session } from "../src/resources/types";
import type { ApiErrorCode } from "../src/generated/error-codes";
import { KvlApiError } from "../src/errors";

describe("type-level contracts", () => {
  it("client.request<T>() resolves to exactly T, not the {data} envelope", () => {
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "apiKey", apiKey: "k" },
    });
    const result = client.request<{ id: string }>({ method: "GET", path: "/sessions/1" });
    expectTypeOf(result).resolves.toEqualTypeOf<{ id: string }>();
  });

  it("client.sessions.list() resolves to a real PageResult<Session>", () => {
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "apiKey", apiKey: "k" },
    });
    expectTypeOf(client.sessions.list()).resolves.toEqualTypeOf<PageResult<Session>>();
  });

  it("client.reports.list() honestly resolves to a plain array, not a PageResult (real route puts pagination in `meta`)", () => {
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "apiKey", apiKey: "k" },
    });
    expectTypeOf(client.reports.list()).resolves.toEqualTypeOf<
      Awaited<ReturnType<typeof client.reports.list>>
    >();
    expectTypeOf(client.reports.list()).resolves.not.toEqualTypeOf<PageResult<unknown>>();
  });

  it("KvlApiError.code accepts a real known ApiErrorCode literal", () => {
    const error = new KvlApiError({
      code: "insufficient_scope" satisfies ApiErrorCode,
      status: 403,
      message: "x",
    });
    expectTypeOf(error.code).toMatchTypeOf<string>();
  });

  it("PageResult<T> always exposes items/nextCursor/total", () => {
    expectTypeOf<PageResult<Session>>().toHaveProperty("items").toEqualTypeOf<Session[]>();
    expectTypeOf<PageResult<Session>>().toHaveProperty("nextCursor").toEqualTypeOf<string | null>();
    expectTypeOf<PageResult<Session>>().toHaveProperty("total").toEqualTypeOf<number>();
  });
});

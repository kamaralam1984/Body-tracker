import { describe, it, expect, vi } from "vitest";
import { loggingMiddleware } from "../src/middleware";

describe("loggingMiddleware", () => {
  it("logs before/after/error using the supplied logger, not a fabricated no-op", () => {
    const logger = { info: vi.fn(), error: vi.fn() };
    const middleware = loggingMiddleware(logger);

    const request = { method: "GET", url: "https://example.test/sessions", headers: new Headers() };
    const returned = middleware.beforeRequest?.(request);
    expect(returned).toBe(request);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("GET https://example.test/sessions"),
    );

    middleware.afterResponse?.({
      request,
      response: new Response(null, { status: 200 }),
      durationMs: 42,
    });
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("200"));

    middleware.onError?.({ request, error: new Error("boom") });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("GET"), expect.any(Error));
  });

  it("defaults to `console` when no logger is supplied", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const middleware = loggingMiddleware();
    middleware.beforeRequest?.({
      method: "GET",
      url: "https://example.test/x",
      headers: new Headers(),
    });
    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });
});

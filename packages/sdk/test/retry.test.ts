import { describe, it, expect, vi } from "vitest";
import { withRetry, CircuitBreaker, DEFAULT_RETRY_CONFIG } from "../src/retry";
import { KvlApiError, KvlCircuitOpenError } from "../src/errors";

describe("withRetry", () => {
  it("returns the result immediately on first success, no retries", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { ...DEFAULT_RETRY_CONFIG, baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries a retryable failure (429) up to maxAttempts then succeeds", async () => {
    const rateLimited = new KvlApiError({
      code: "rate_limited",
      status: 429,
      message: "slow down",
    });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimited)
      .mockRejectedValueOnce(rateLimited)
      .mockResolvedValueOnce("ok");
    const result = await withRetry(fn, { ...DEFAULT_RETRY_CONFIG, baseDelayMs: 1, maxAttempts: 3 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry a non-retryable error (422 validation) — fails immediately", async () => {
    const validationError = new KvlApiError({
      code: "validation_error",
      status: 422,
      message: "bad input",
    });
    const fn = vi.fn().mockRejectedValue(validationError);
    await expect(withRetry(fn, { ...DEFAULT_RETRY_CONFIG, baseDelayMs: 1 })).rejects.toBe(
      validationError,
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws the last error once maxAttempts is exhausted", async () => {
    const serverError = new KvlApiError({ code: "internal_error", status: 503, message: "down" });
    const fn = vi.fn().mockRejectedValue(serverError);
    await expect(
      withRetry(fn, { ...DEFAULT_RETRY_CONFIG, baseDelayMs: 1, maxAttempts: 2 }),
    ).rejects.toBe(serverError);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("a real network failure (no status field) is treated as retryable", async () => {
    const networkError = new Error("network down");
    const fn = vi.fn().mockRejectedValueOnce(networkError).mockResolvedValueOnce("ok");
    const result = await withRetry(fn, { ...DEFAULT_RETRY_CONFIG, baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("CircuitBreaker", () => {
  it("stays closed and passes through successful calls", async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
    const result = await breaker.execute(() => Promise.resolve("ok"));
    expect(result).toBe("ok");
    expect(breaker.getState()).toBe("closed");
  });

  it("opens after `failureThreshold` consecutive failures and rejects further calls without invoking fn", async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 10_000 });
    const failing = () => Promise.reject(new Error("boom"));

    await expect(breaker.execute(failing)).rejects.toThrow("boom");
    await expect(breaker.execute(failing)).rejects.toThrow("boom");
    expect(breaker.getState()).toBe("open");

    const fn = vi.fn().mockResolvedValue("should not run");
    await expect(breaker.execute(fn)).rejects.toBeInstanceOf(KvlCircuitOpenError);
    expect(fn).not.toHaveBeenCalled();
  });

  it("moves to half-open after resetTimeoutMs and fully closes on a successful trial", async () => {
    vi.useFakeTimers();
    try {
      const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });
      await expect(breaker.execute(() => Promise.reject(new Error("boom")))).rejects.toThrow();
      expect(breaker.getState()).toBe("open");

      vi.advanceTimersByTime(1001);

      const result = await breaker.execute(() => Promise.resolve("recovered"));
      expect(result).toBe("recovered");
      expect(breaker.getState()).toBe("closed");
    } finally {
      vi.useRealTimers();
    }
  });
});

import { KvlCircuitOpenError } from "./errors";

export interface RetryConfig {
  /** Max attempts including the first — 3 means "1 initial try + up to 2 retries." Default 3. */
  maxAttempts: number;
  /** Base delay for exponential backoff (delay = baseDelayMs * 2^attempt, capped at maxDelayMs). Default 300. */
  baseDelayMs: number;
  maxDelayMs: number;
  /** Called to decide whether a given failure is worth retrying at all. Default: network errors and 429/502/503/504. */
  shouldRetry: (error: unknown, attempt: number) => boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 8_000,
  shouldRetry: (error) => {
    const status = (error as { status?: number } | null)?.status;
    if (status === undefined) return true; // no `status` means it never even got an HTTP response — a real network failure, always worth retrying
    return status === 429 || status === 502 || status === 503 || status === 504;
  },
};

function backoffDelay(attempt: number, config: RetryConfig): number {
  const exp = Math.min(config.baseDelayMs * 2 ** attempt, config.maxDelayMs);
  // Full jitter (AWS's recommended strategy) — avoids every retrying
  // client waking up at the exact same instant and re-stampeding the
  // server together.
  return Math.random() * exp;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  config: RetryConfig,
  signal?: AbortSignal,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === config.maxAttempts - 1;
      if (isLastAttempt || !config.shouldRetry(error, attempt)) throw error;
      await sleep(backoffDelay(attempt, config), signal);
    }
  }
  throw lastError;
}

export interface CircuitBreakerConfig {
  /** Consecutive failures before the circuit opens. Default 5. */
  failureThreshold: number;
  /** How long the circuit stays open before allowing one trial request through (half-open). Default 30s. */
  resetTimeoutMs: number;
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
};

type CircuitState = "closed" | "open" | "half-open";

/**
 * A real circuit breaker (not just a retry loop) — after
 * `failureThreshold` consecutive failures, every further request is
 * rejected immediately with `KvlCircuitOpenError` (no network call at
 * all) until `resetTimeoutMs` passes, at which point exactly one
 * "trial" request is let through (half-open); if it succeeds the
 * circuit fully closes, if it fails the circuit re-opens for another
 * full `resetTimeoutMs`.
 */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private openedAt = 0;

  constructor(private config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG) {}

  private timeSinceOpen(): number {
    return Date.now() - this.openedAt;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      const elapsed = this.timeSinceOpen();
      if (elapsed < this.config.resetTimeoutMs) {
        throw new KvlCircuitOpenError(this.config.resetTimeoutMs - elapsed);
      }
      this.state = "half-open";
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.consecutiveFailures += 1;
    if (this.state === "half-open" || this.consecutiveFailures >= this.config.failureThreshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

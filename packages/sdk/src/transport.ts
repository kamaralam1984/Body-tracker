import { AuthManager } from "./auth";
import { CircuitBreaker, withRetry, DEFAULT_RETRY_CONFIG, type RetryConfig } from "./retry";
import { KvlApiError, KvlNetworkError, KvlTimeoutError, KvlAbortError } from "./errors";
import { EventEmitter } from "./event-emitter";
import type { Middleware, RequestContext } from "./middleware";

export interface RequestOptions {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** Send as `multipart/form-data` instead of JSON — used by the file-upload module. */
  formData?: FormData;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface TransportConfig {
  baseUrl: string;
  auth: AuthManager;
  fetchImpl: typeof fetch;
  retry: RetryConfig;
  circuitBreaker: CircuitBreaker;
  timeoutMs: number;
  middleware: Middleware[];
  events: EventEmitter;
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path.replace(/^\//, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseErrorEnvelope(response: Response): Promise<KvlApiError> {
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string; details?: unknown };
      meta?: { traceId?: string };
    };
    return new KvlApiError({
      code: body.error?.code ?? "internal_error",
      status: response.status,
      message: body.error?.message ?? `Request failed with status ${response.status}`,
      details: body.error?.details,
      traceId: body.meta?.traceId,
    });
  } catch {
    return new KvlApiError({
      code: "internal_error",
      status: response.status,
      message: `Request failed with status ${response.status}`,
    });
  }
}

/**
 * The transport every resource client (`client.sessions`, `client.users`,
 * ...) funnels through — real auth-header injection with one automatic
 * refresh-and-retry on a 401, real exponential-backoff retry + circuit
 * breaker for transient failures, real timeout via `AbortController`
 * (distinct from a caller's own `signal`), and real middleware hooks.
 * Emits real lifecycle events (`request.start`/`request.success`/
 * `request.error`) on the shared client event emitter so
 * `client.on("request.error", ...)` works the same way any other SDK
 * event does.
 */
export class Transport {
  constructor(private config: TransportConfig) {}

  async request<T>(options: RequestOptions): Promise<T> {
    return this.config.circuitBreaker.execute(() =>
      withRetry((attempt) => this.attempt<T>(options, attempt), this.config.retry, options.signal),
    );
  }

  private async attempt<T>(options: RequestOptions, attempt: number): Promise<T> {
    let ctx: RequestContext = {
      method: options.method,
      url: buildUrl(this.config.baseUrl, options.path, options.query),
      headers: new Headers(options.headers),
    };

    const authHeader = this.config.auth.getAuthHeader();
    if (authHeader) ctx.headers.set("Authorization", authHeader);

    if (options.formData) {
      ctx.body = options.formData;
    } else if (options.body !== undefined) {
      ctx.headers.set("Content-Type", "application/json");
      ctx.body = JSON.stringify(options.body);
    }

    for (const mw of this.config.middleware) {
      if (mw.beforeRequest) ctx = await mw.beforeRequest(ctx);
    }

    this.config.events.emit("request.start", { method: ctx.method, url: ctx.url, attempt });
    const startedAt = Date.now();

    const timeoutController = new AbortController();
    const timeoutTimer = setTimeout(() => timeoutController.abort(), this.config.timeoutMs);
    const combinedSignal = options.signal
      ? anySignal([options.signal, timeoutController.signal])
      : timeoutController.signal;

    let response: Response;
    try {
      response = await this.config.fetchImpl(ctx.url, {
        method: ctx.method,
        headers: ctx.headers,
        body: ctx.body,
        signal: combinedSignal,
      });
    } catch (error) {
      clearTimeout(timeoutTimer);
      const wrapped = options.signal?.aborted
        ? new KvlAbortError()
        : timeoutController.signal.aborted
          ? new KvlTimeoutError(this.config.timeoutMs)
          : new KvlNetworkError("Network request failed", error);
      await this.runErrorMiddleware(ctx, wrapped);
      this.config.events.emit("request.error", {
        method: ctx.method,
        url: ctx.url,
        error: wrapped,
      });
      throw wrapped;
    }
    clearTimeout(timeoutTimer);

    // One automatic refresh-and-retry on a 401 for bearer-session auth —
    // the same "refresh once, retry once" contract as this app's own
    // frontend (`src/features/auth/lib/api-client.ts`), just generalized
    // to any base URL.
    if (response.status === 401 && attempt === 0 && this.config.auth.canRefresh) {
      const refreshed = await this.config.auth.refresh();
      if (refreshed) return this.attempt<T>(options, attempt + 1);
    }

    const durationMs = Date.now() - startedAt;
    for (const mw of this.config.middleware) {
      if (mw.afterResponse)
        await mw.afterResponse({ request: ctx, response: response.clone(), durationMs });
    }

    if (!response.ok) {
      const error = await parseErrorEnvelope(response);
      await this.runErrorMiddleware(ctx, error);
      this.config.events.emit("request.error", { method: ctx.method, url: ctx.url, error });
      throw error;
    }

    this.config.events.emit("request.success", {
      method: ctx.method,
      url: ctx.url,
      status: response.status,
      durationMs,
    });

    if (response.status === 204) return undefined as T;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await response.json()) as { data: T };
      return body.data;
    }
    return (await response.blob()) as T;
  }

  private async runErrorMiddleware(request: RequestContext, error: unknown): Promise<void> {
    for (const mw of this.config.middleware) {
      if (mw.onError) await mw.onError({ request, error });
    }
  }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

export { DEFAULT_RETRY_CONFIG };

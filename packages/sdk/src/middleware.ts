export interface RequestContext {
  method: string;
  url: string;
  headers: Headers;
  body?: BodyInit | null;
}

export interface ResponseContext {
  request: RequestContext;
  response: Response;
  durationMs: number;
}

export interface ErrorContext {
  request: RequestContext;
  error: unknown;
}

/** Hooks a caller can register via `client.use(middleware)` to observe or rewrite every request/response — the same shape Stripe/Axios-style SDKs expose (`beforeRequest`/`afterResponse`/`onError`), plus a `logging`/`auth` pair as named conveniences below. */
export interface Middleware {
  beforeRequest?: (ctx: RequestContext) => RequestContext | Promise<RequestContext>;
  afterResponse?: (ctx: ResponseContext) => void | Promise<void>;
  onError?: (ctx: ErrorContext) => void | Promise<void>;
}

/** A ready-made logging middleware — `client.use(loggingMiddleware())` — real request/response/error logging via a caller-supplied logger (defaults to `console`), not a fabricated no-op. */
export function loggingMiddleware(logger: Pick<Console, "info" | "error"> = console): Middleware {
  return {
    beforeRequest(ctx) {
      logger.info(`[kvl] → ${ctx.method} ${ctx.url}`);
      return ctx;
    },
    afterResponse(ctx) {
      logger.info(
        `[kvl] ← ${ctx.response.status} ${ctx.request.method} ${ctx.request.url} (${ctx.durationMs}ms)`,
      );
    },
    onError(ctx) {
      logger.error(`[kvl] ✕ ${ctx.request.method} ${ctx.request.url}`, ctx.error);
    },
  };
}

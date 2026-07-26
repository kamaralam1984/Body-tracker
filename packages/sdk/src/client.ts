import { EventEmitter } from "./event-emitter";
import { AuthManager, type AuthMode } from "./auth";
import { Transport, type RequestOptions } from "./transport";
import {
  CircuitBreaker,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  type RetryConfig,
  type CircuitBreakerConfig,
} from "./retry";
import type { Middleware } from "./middleware";
import { SessionsResource } from "./resources/sessions";
import { ApiKeysResource } from "./resources/api-keys";
import { TrackingResource } from "./resources/tracking";
import { AnalyticsResource } from "./resources/analytics";
import { ReportsResource } from "./resources/reports";
import { WebhooksResource } from "./resources/webhooks";
import { OrganizationsResource } from "./resources/organizations";
import { UsersResource } from "./resources/users";
import { ServiceAccountsResource } from "./resources/service-accounts";
import { OAuthResource } from "./resources/oauth";
import { NotificationsResource } from "./resources/notifications";
import { SecurityCenterResource } from "./resources/security-center";
import { PlatformAdminResource } from "./resources/platform-admin";
import { RealtimeClient } from "./realtime";
import { UploadsClient } from "./uploads";

const DEFAULT_BASE_URL = "/api/v1";
const DEFAULT_TIMEOUT_MS = 30_000;

export interface KvlClientConfig {
  /** Defaults to the relative `/api/v1` — only resolvable when running in a browser against the same origin. Node/cross-origin callers MUST pass an absolute URL (e.g. `https://bodytracker.kvlbusinesssolutions.com/api/v1`). */
  baseUrl?: string;
  auth: AuthMode;
  /** Override the fetch implementation — mainly for tests (a mock server) or an exotic runtime without a global `fetch`. Node 18+ and every real browser already have one. */
  fetch?: typeof fetch;
  retry?: Partial<RetryConfig>;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  /** Per-request timeout, distinct from a caller's own `AbortSignal`. Default 30s. */
  timeoutMs?: number;
  middleware?: Middleware[];
}

/**
 * The root SDK client — extends `EventEmitter` directly so `client.on(...)`
 * /`client.once(...)`/`client.off(...)` work exactly as documented,
 * firing both real request-lifecycle events (`request.start`,
 * `request.success`, `request.error`) and real auth events
 * (`auth.session_updated`, `auth.session_cleared`) from one place.
 * Resource namespaces (`client.sessions`, `client.users`, ...) are
 * attached in `resources.ts`; real-time (`client.realtime`) and uploads
 * (`client.uploads`) are attached in their own modules.
 */
export class KvlClient extends EventEmitter {
  readonly auth: AuthManager;
  readonly baseUrl: string;
  private middleware: Middleware[];
  private transport: Transport;
  private fetchImpl: typeof fetch;

  readonly sessions: SessionsResource;
  readonly apiKeys: ApiKeysResource;
  readonly tracking: TrackingResource;
  readonly analytics: AnalyticsResource;
  readonly reports: ReportsResource;
  readonly webhooks: WebhooksResource;
  readonly organizations: OrganizationsResource;
  readonly users: UsersResource;
  readonly serviceAccounts: ServiceAccountsResource;
  readonly oauth: OAuthResource;
  readonly notifications: NotificationsResource;
  readonly securityCenter: SecurityCenterResource;
  /** Every method here requires a real platform-admin principal — see `PlatformAdminResource`'s own doc comment. */
  readonly platformAdmin: PlatformAdminResource;
  /** Real-time tracking events for one session at a time — see `RealtimeClient`'s own doc comment for exactly what's real here (SSE, not WebSocket; no presence/typing). */
  readonly realtime: RealtimeClient;
  /** Real single-file avatar upload with real progress events — see `UploadsClient`'s own doc comment for why this is separate from `client.users.updateAvatar()`. */
  readonly uploads: UploadsClient;

  constructor(config: KvlClientConfig) {
    super();

    if (!config.baseUrl && typeof window === "undefined") {
      throw new Error(
        "@kvl/sdk: `baseUrl` is required outside a browser — there's no same-origin default to fall back to in Node.",
      );
    }
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchImpl = config.fetch ?? globalThis.fetch.bind(globalThis);
    this.middleware = config.middleware ?? [];

    this.auth = new AuthManager(config.auth, this.baseUrl, this.fetchImpl);
    this.auth.events.on("*", (payload, eventName) => this.emit(eventName, payload));

    this.transport = new Transport({
      baseUrl: this.baseUrl,
      auth: this.auth,
      fetchImpl: this.fetchImpl,
      retry: { ...DEFAULT_RETRY_CONFIG, ...config.retry },
      circuitBreaker: new CircuitBreaker({
        ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
        ...config.circuitBreaker,
      }),
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      middleware: this.middleware,
      events: this,
    });

    this.sessions = new SessionsResource(this);
    this.apiKeys = new ApiKeysResource(this);
    this.tracking = new TrackingResource(this);
    this.analytics = new AnalyticsResource(this);
    this.reports = new ReportsResource(this);
    this.webhooks = new WebhooksResource(this);
    this.organizations = new OrganizationsResource(this);
    this.users = new UsersResource(this);
    this.serviceAccounts = new ServiceAccountsResource(this);
    this.oauth = new OAuthResource(this);
    this.notifications = new NotificationsResource(this);
    this.securityCenter = new SecurityCenterResource(this);
    this.platformAdmin = new PlatformAdminResource(this);
    this.realtime = new RealtimeClient(this);
    this.uploads = new UploadsClient(this);
  }

  /** Registers request middleware after construction — e.g. `client.use(loggingMiddleware())`. */
  use(middleware: Middleware): void {
    this.middleware.push(middleware);
  }

  /** The low-level method every resource client calls — public so advanced callers can hit an endpoint this SDK version hasn't wrapped yet without losing auth/retry/middleware. */
  request<T>(options: RequestOptions): Promise<T> {
    return this.transport.request<T>(options);
  }

  /** Real `POST /auth/login` — convenience for `client.auth.login(...)`. See `AuthManager.login`'s doc comment. */
  login(email: string, password: string) {
    return this.auth.login(email, password);
  }

  /** Real `POST /auth/logout` (revokes the refresh token server-side) then clears local session state — convenience for `client.auth.logout()`. */
  logout(): Promise<void> {
    return this.auth.logout();
  }
}

import {
  createLocalStorageTokenStore,
  createMemoryTokenStore,
  type TokenStore,
} from "./token-store";
import { EventEmitter } from "./event-emitter";
import { KvlApiError, KvlNetworkError } from "./errors";

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResult extends AuthResult {
  user: {
    id: string;
    orgId: string;
    teamId: string | null;
    email: string;
    name: string;
    role: string;
    status: string;
    createdAt: string;
  };
}

/**
 * Every real auth method this API actually supports (see
 * `resolvePrincipal()` in the server's `src/server/http/principal.ts`):
 * a static API key (`Authorization: ApiKey <key>` — for server-to-server/
 * service-account use, never refreshed, no login/logout concept), or a
 * Bearer session. `"bearer"` starts already-signed-in (you supply
 * existing tokens, e.g. restored from your own storage); `"none"` starts
 * signed OUT — call `client.auth.login(email, password)` to establish a
 * real session, exactly like this app's own frontend does. Both are the
 * same real session machinery underneath; `"none"` just starts empty.
 * OAuth2 access tokens are just Bearer tokens once issued —
 * `client.oauth.*` handles the authorization-code+PKCE exchange and
 * feeds the resulting tokens back into this same session.
 */
export type AuthMode =
  | { type: "apiKey"; apiKey: string }
  | {
      type: "bearer";
      accessToken?: string;
      refreshToken?: string;
      /** Defaults to `localStorage` in a browser, in-memory (non-persistent) in Node — see `token-store.ts`. */
      store?: TokenStore;
    }
  | { type: "none"; store?: TokenStore };

export class AuthManager {
  private mode: AuthMode;
  private store: TokenStore;
  private refreshInFlight: Promise<boolean> | null = null;
  readonly events = new EventEmitter();

  constructor(
    mode: AuthMode,
    private baseUrl: string,
    private fetchImpl: typeof fetch,
  ) {
    this.mode = mode;
    if (mode.type === "apiKey") {
      this.store = createMemoryTokenStore();
      return;
    }
    this.store =
      mode.store ??
      (typeof window === "undefined" ? createMemoryTokenStore() : createLocalStorageTokenStore());
    if (mode.type === "bearer" && mode.accessToken && mode.refreshToken) {
      this.store.setTokens({ accessToken: mode.accessToken, refreshToken: mode.refreshToken });
    }
  }

  private get isSessionCapable(): boolean {
    return this.mode.type !== "apiKey";
  }

  getAuthHeader(): string | null {
    if (this.mode.type === "apiKey") return `ApiKey ${this.mode.apiKey}`;
    const tokens = this.store.getTokens();
    return tokens ? `Bearer ${tokens.accessToken}` : null;
  }

  /** True whenever a 401 could plausibly be recovered by refreshing — i.e. session-capable mode with a real session already established. */
  get canRefresh(): boolean {
    return this.isSessionCapable && this.store.getTokens() !== null;
  }

  setSession(tokens: { accessToken: string; refreshToken: string }): void {
    this.store.setTokens(tokens);
    this.events.emit("auth.session_updated", tokens);
  }

  clearSession(): void {
    this.store.clear();
    this.events.emit("auth.session_cleared", undefined);
  }

  /** Real `POST /auth/login` — establishes a real session the same way this app's own frontend does. Not available in `apiKey` mode. */
  async login(email: string, password: string): Promise<LoginResult> {
    if (!this.isSessionCapable) {
      throw new Error("@kvl/sdk: login() isn't available in `apiKey` auth mode.");
    }
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch (error) {
      throw new KvlNetworkError("Login request failed", error);
    }
    const body = (await response.json()) as {
      data?: LoginResult;
      error?: { code?: string; message?: string; details?: unknown };
    };
    if (!response.ok) {
      throw new KvlApiError({
        code: body.error?.code ?? "unauthorized",
        status: response.status,
        message: body.error?.message ?? "Login failed",
        details: body.error?.details,
      });
    }
    const result = body.data as LoginResult;
    this.setSession({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    return result;
  }

  /** Real `POST /auth/logout` (revokes the real refresh token server-side) then clears local session state. Not available in `apiKey` mode — there's no session to log out of. */
  async logout(): Promise<void> {
    if (!this.isSessionCapable) return;
    const tokens = this.store.getTokens();
    if (tokens) {
      await this.fetchImpl(`${this.baseUrl}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      }).catch(() => {
        // Best-effort — the server-side revoke failing shouldn't block clearing the local session.
      });
    }
    this.clearSession();
  }

  /** Deduped — concurrent 401s from several in-flight requests trigger exactly one real refresh call. */
  async refresh(): Promise<boolean> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.doRefresh().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  private async doRefresh(): Promise<boolean> {
    const tokens = this.store.getTokens();
    if (!tokens) return false;
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      if (!response.ok) {
        this.clearSession();
        return false;
      }
      const body = (await response.json()) as { data: AuthResult };
      this.setSession({ accessToken: body.data.accessToken, refreshToken: body.data.refreshToken });
      return true;
    } catch {
      return false;
    }
  }
}

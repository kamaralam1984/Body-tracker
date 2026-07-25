/**
 * Thin fetch wrapper for the browser app to call its own real `/api/v1/*`
 * backend as an authenticated user. Attaches the stored access token,
 * transparently refreshes once on a 401 (the access token TTL is short —
 * see `src/server/auth/tokens.ts` — refresh tokens live far longer), and
 * throws `ApiClientError` with the server's real error message on failure
 * so callers (e.g. the login form) can show it directly.
 *
 * Token storage lives in `localStorage` under `TOKEN_STORAGE_KEY` — read
 * directly here (not via `AuthProvider`) so this module has no React
 * dependency and can be called from anywhere, including non-component code
 * like the tracking feature's session-sync hook.
 */

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  orgId: string;
  teamId: string | null;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: AuthUser;
}

const TOKEN_STORAGE_KEY = "btk_tokens";
const USER_STORAGE_KEY = "btk_user";

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function readStoredTokens(): StoredTokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    return null;
  }
}

export function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function storeSession(tokens: StoredTokens, user: AuthUser | undefined): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  if (user) window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
}

async function parseErrorBody(response: Response): Promise<ApiClientError> {
  try {
    const body = await response.json();
    const code = body?.error?.code ?? "internal_error";
    const message = body?.error?.message ?? "Something went wrong. Please try again.";
    return new ApiClientError(code, message, response.status);
  } catch {
    return new ApiClientError(
      "internal_error",
      "Something went wrong. Please try again.",
      response.status,
    );
  }
}

/** Calls `POST /api/v1/auth/refresh` directly — used both by `apiFetch`'s retry-on-401 and `AuthProvider`. */
export async function refreshTokens(refreshToken: string): Promise<AuthResult> {
  const response = await fetch("/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) throw await parseErrorBody(response);
  const body = await response.json();
  return body.data as AuthResult;
}

let refreshInFlight: Promise<StoredTokens | null> | null = null;

/** Ensures only one refresh call is ever in flight even if several requests 401 at once. */
async function refreshOnce(): Promise<StoredTokens | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const stored = readStoredTokens();
      if (!stored) return null;
      try {
        const result = await refreshTokens(stored.refreshToken);
        const next: StoredTokens = {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        };
        storeSession(next, result.user);
        return next;
      } catch {
        clearSession();
        return null;
      }
    })();
  }
  const result = await refreshInFlight;
  refreshInFlight = null;
  return result;
}

/**
 * Authenticated fetch against this app's own `/api/v1/*` backend. On a 401
 * (expired access token), refreshes once and retries the original request;
 * if refresh also fails, clears the stored session so the next render's
 * route guard redirects to `/login`.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const tokens = readStoredTokens();

  async function attempt(accessToken: string | undefined): Promise<Response> {
    const headers = new Headers(init.headers);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return fetch(path, { ...init, headers });
  }

  let response = await attempt(tokens?.accessToken);

  if (response.status === 401 && tokens) {
    const refreshed = await refreshOnce();
    if (refreshed) response = await attempt(refreshed.accessToken);
  }

  if (!response.ok) throw await parseErrorBody(response);
  return response;
}

/** Convenience wrapper for JSON-returning endpoints — unwraps the `{data}` envelope every real route uses (see `src/server/http/respond.ts`). */
export async function apiFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  const body = await response.json();
  return body.data as T;
}

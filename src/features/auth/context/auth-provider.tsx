"use client";

/**
 * The one real, server-verified identity for the browser app. Hydrates from
 * `localStorage` on mount (so a refresh doesn't bounce a logged-in user back
 * to `/login`), and exposes `login`/`logout` that call the real
 * `/api/v1/auth/{login,logout}` routes — see `src/server/services/auth-service.ts`.
 *
 * `status` starts `"loading"` until hydration finishes, specifically so the
 * route guard (see `src/app/(app)/layout.tsx`) can wait for that instead of
 * redirecting a genuinely-logged-in user during the first render.
 *
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 *
 * // Anywhere inside:
 * const { user, status, login, logout } = useAuth();
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  apiFetch,
  clearSession,
  readStoredTokens,
  readStoredUser,
  storeSession,
  type AuthResult,
  type AuthUser,
} from "../lib/api-client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface UseAuthResult {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<UseAuthResult | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    // Runs once on mount only, to report real hydrated session state without
    // risking a server/client mismatch — localStorage doesn't exist during SSR.
    const tokens = readStoredTokens();
    const storedUser = readStoredUser();
    if (tokens && storedUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(storedUser);
      setStatus("authenticated");
    } else {
      setStatus("unauthenticated");
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.error?.message ?? "Invalid email or password");
    }
    const result = body.data as AuthResult;
    storeSession(
      { accessToken: result.accessToken, refreshToken: result.refreshToken },
      result.user,
    );
    if (result.user) setUser(result.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    const tokens = readStoredTokens();
    if (tokens) {
      try {
        await apiFetch("/api/v1/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
      } catch {
        // Best-effort server-side revocation — clear the local session either way.
      }
    }
    clearSession();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): UseAuthResult {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

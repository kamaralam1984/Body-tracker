export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

/** Pluggable token persistence — swap in a real secure store (Keychain via a native bridge, Electron's `safeStorage`, etc.) by implementing this interface; the two built-ins below cover the common real cases. */
export interface TokenStore {
  getTokens(): StoredTokens | null;
  setTokens(tokens: StoredTokens): void;
  clear(): void;
}

const STORAGE_KEY = "kvl_sdk_tokens";

/** Real `localStorage`-backed persistence — the same mechanism this app's own frontend already uses (see `src/features/auth/lib/api-client.ts`), so a token stored by one is readable by the other. No-ops safely outside a browser (SSR). */
export function createLocalStorageTokenStore(storageKey = STORAGE_KEY): TokenStore {
  return {
    getTokens() {
      if (typeof window === "undefined") return null;
      try {
        const raw = window.localStorage.getItem(storageKey);
        return raw ? (JSON.parse(raw) as StoredTokens) : null;
      } catch {
        return null;
      }
    },
    setTokens(tokens) {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(storageKey, JSON.stringify(tokens));
    },
    clear() {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(storageKey);
    },
  };
}

/** In-process, non-persistent storage — the honest default for Node (a server process has no browser `localStorage`, and silently writing plaintext tokens to disk without being asked is exactly the kind of thing this SDK should never do on its own). Tokens are lost on restart unless the caller supplies their own `TokenStore`. */
export function createMemoryTokenStore(): TokenStore {
  let tokens: StoredTokens | null = null;
  return {
    getTokens: () => tokens,
    setTokens: (next) => {
      tokens = next;
    },
    clear: () => {
      tokens = null;
    },
  };
}

"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { KvlClient } from "@kvl/sdk";

const KvlContext = createContext<KvlClient | null>(null);

export interface KvlProviderProps {
  client: KvlClient;
  /** Supply your own if your app already has one elsewhere — otherwise a real, dedicated one is created for you. */
  queryClient?: QueryClient;
  children: ReactNode;
}

/**
 * Root provider — wraps `children` in the real `KvlClient` context every
 * hook in this package reads, plus a real `@tanstack/react-query`
 * `QueryClientProvider` (this SDK's `useQuery`/`useMutation`/
 * `useInfiniteQuery` are real, thin wrappers over react-query, not a
 * reinvented cache engine — see `use-query.ts`). A fresh `QueryClient` is
 * created once per mount via a lazy `useState` initializer if you don't
 * supply your own.
 */
export function KvlProvider({ client, queryClient, children }: KvlProviderProps) {
  const [ownQueryClient] = useState(() => queryClient ?? new QueryClient());
  return (
    <KvlContext.Provider value={client}>
      <QueryClientProvider client={queryClient ?? ownQueryClient}>{children}</QueryClientProvider>
    </KvlContext.Provider>
  );
}

/** The real `KvlClient` instance passed to the nearest `<KvlProvider>` — throws a clear error if called outside one, rather than silently returning `null` and failing later with a confusing "cannot read property of null." */
export function useKvlClient(): KvlClient {
  const client = useContext(KvlContext);
  if (!client) {
    throw new Error(
      "useKvlClient() (and every other @kvl/react hook) must be used inside <KvlProvider>.",
    );
  }
  return client;
}

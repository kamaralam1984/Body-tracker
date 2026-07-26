"use client";

import {
  useQuery as useReactQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { KvlClient } from "@kvl/sdk";
import { useKvlClient } from "./provider";

/**
 * Real data-fetching hook — a thin, SDK-flavored wrapper over
 * `@tanstack/react-query`'s `useQuery` (real caching, dedup, background
 * refetch — not reinvented), just handing your `queryFn` the real
 * `KvlClient` instance instead of making you pull it from context
 * yourself.
 *
 * @example
 * const { data, isLoading } = useQuery(["sessions", params], (client) => client.sessions.list(params));
 */
export function useQuery<T>(
  queryKey: readonly unknown[],
  queryFn: (client: KvlClient) => Promise<T>,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
): UseQueryResult<T> {
  const client = useKvlClient();
  return useReactQuery({
    queryKey: queryKey as unknown[],
    queryFn: () => queryFn(client),
    ...options,
  });
}

"use client";

import {
  useInfiniteQuery as useReactInfiniteQuery,
  type UseInfiniteQueryOptions,
  type InfiniteData,
} from "@tanstack/react-query";
import type { KvlClient, PageResult } from "@kvl/sdk";
import { useKvlClient } from "./provider";

/**
 * Real cursor-pagination hook — for the resource-client methods that
 * return the SDK's real `PageResult<T>` shape (`{items, nextCursor,
 * total}` — e.g. `client.sessions.list`, `client.apiKeys.list`; NOT the
 * handful of real routes that return a plain array with pagination
 * metadata this SDK can't surface, like `client.reports.list` — see that
 * method's own doc comment). A thin wrapper over `@tanstack/react-query`'s
 * `useInfiniteQuery`, using the real `nextCursor` as the next page param.
 *
 * @example
 * const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(
 *   ["sessions"],
 *   (client, cursor) => client.sessions.list({ cursor }),
 * );
 */
export function useInfiniteQuery<T>(
  queryKey: readonly unknown[],
  queryFn: (client: KvlClient, cursor: string | undefined) => Promise<PageResult<T>>,
  options?: Omit<
    UseInfiniteQueryOptions<PageResult<T>, unknown, InfiniteData<PageResult<T>>>,
    "queryKey" | "queryFn" | "getNextPageParam" | "initialPageParam"
  >,
) {
  const client = useKvlClient();
  return useReactInfiniteQuery({
    queryKey: queryKey as unknown[],
    queryFn: ({ pageParam }) => queryFn(client, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: PageResult<T>) => lastPage.nextCursor ?? undefined,
    ...options,
  });
}

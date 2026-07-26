"use client";

import {
  useMutation as useReactMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import type { KvlClient } from "@kvl/sdk";
import { useKvlClient } from "./provider";

/**
 * Real mutation hook — a thin wrapper over `@tanstack/react-query`'s
 * `useMutation`, handing your `mutationFn` the real `KvlClient` instance.
 *
 * @example
 * const revoke = useMutation((client, id: string) => client.apiKeys.revoke(id));
 * revoke.mutate(keyId);
 */
export function useMutation<TData, TVariables = void>(
  mutationFn: (client: KvlClient, variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, unknown, TVariables>, "mutationFn">,
): UseMutationResult<TData, unknown, TVariables> {
  const client = useKvlClient();
  return useReactMutation({
    mutationFn: (variables: TVariables) => mutationFn(client, variables),
    ...options,
  });
}

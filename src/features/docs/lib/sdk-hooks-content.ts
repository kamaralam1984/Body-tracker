/**
 * Real reference content for `@kvl/react`'s hooks — one `HookDoc` per
 * hook. Every hook reads the real `KvlClient` provided by `<KvlProvider>`
 * (see the Quick Start) via `@tanstack/react-query` underneath for the
 * data-fetching ones — a real, well-tested caching engine, not a
 * reinvented one. This covers the generic hooks plus a representative
 * sample of the real domain hooks; the rest (useSession, useNotifications,
 * useSecurityCenter, useUpload) follow the exact same useQuery/useMutation
 * pattern shown here — see packages/react/src/hooks.ts for the full list.
 *
 * Rendered by `src/app/docs/hooks/page.tsx` via `<HookCard doc={...} />`.
 */

import type { HookDoc } from "../types";

export const SDK_HOOKS: HookDoc[] = [
  {
    id: "use-kvl-client",
    name: "useKvlClient()",
    signature: "function useKvlClient(): KvlClient",
    description:
      "Returns the real KvlClient instance passed to the nearest <KvlProvider>. Throws a clear error if called outside one, rather than silently returning null.",
    params: [],
    returns: { type: "KvlClient", description: "The real client instance." },
    example: {
      language: "tsx",
      filename: "Profile.tsx",
      code: `import { useKvlClient } from "@kvl/react";

export function LogoutButton() {
  const client = useKvlClient();
  return <button onClick={() => client.logout()}>Sign out</button>;
}
`,
    },
    since: "0.1.0",
  },
  {
    id: "use-query",
    name: "useQuery()",
    signature:
      "function useQuery<T>(queryKey: readonly unknown[], queryFn: (client: KvlClient) => Promise<T>, options?): UseQueryResult<T>",
    description:
      "Real data-fetching — a thin wrapper over @tanstack/react-query's useQuery, handing your queryFn the real client instead of making you pull it from context yourself. Every domain hook (useCurrentUser, useSessions, ...) is built on this.",
    params: [
      {
        name: "queryKey",
        type: "readonly unknown[]",
        required: true,
        description: "A real react-query cache key.",
      },
      {
        name: "queryFn",
        type: "(client: KvlClient) => Promise<T>",
        required: true,
        description: "Your real fetch call.",
      },
    ],
    returns: {
      type: "UseQueryResult<T>",
      description:
        "The real react-query result object: data, isLoading, isError, error, refetch, ...",
    },
    example: {
      language: "tsx",
      filename: "Sessions.tsx",
      code: `import { useQuery } from "@kvl/react";

const { data, isLoading } = useQuery(["sessions"], (client) => client.sessions.list());
`,
    },
    since: "0.1.0",
  },
  {
    id: "use-mutation",
    name: "useMutation()",
    signature:
      "function useMutation<TData, TVariables>(mutationFn: (client: KvlClient, variables: TVariables) => Promise<TData>, options?): UseMutationResult<TData, unknown, TVariables>",
    description: "Real mutations — a thin wrapper over @tanstack/react-query's useMutation.",
    params: [
      {
        name: "mutationFn",
        type: "(client, variables) => Promise<TData>",
        required: true,
        description: "Your real write call.",
      },
    ],
    returns: {
      type: "UseMutationResult",
      description: "mutate, mutateAsync, isPending, isSuccess, isError, ...",
    },
    example: {
      language: "tsx",
      filename: "RevokeKey.tsx",
      code: `import { useMutation } from "@kvl/react";

const revoke = useMutation((client, id: string) => client.apiKeys.revoke(id));
revoke.mutate(keyId);
`,
    },
    since: "0.1.0",
  },
  {
    id: "use-infinite-query",
    name: "useInfiniteQuery()",
    signature:
      "function useInfiniteQuery<T>(queryKey, queryFn: (client, cursor) => Promise<PageResult<T>>, options?)",
    description:
      "Real cursor pagination for the resource methods that return the SDK's real PageResult<T> shape (client.sessions.list, client.apiKeys.list — not the handful of real routes whose pagination lives in the response's meta instead of data, like client.reports.list; see that method's own note).",
    params: [
      {
        name: "queryFn",
        type: "(client, cursor) => Promise<PageResult<T>>",
        required: true,
        description: "Uses the real nextCursor as the next page param.",
      },
    ],
    returns: {
      type: "UseInfiniteQueryResult",
      description: "data.pages, fetchNextPage, hasNextPage, ...",
    },
    example: {
      language: "tsx",
      filename: "SessionList.tsx",
      code: `import { useInfiniteQuery } from "@kvl/react";

const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(
  ["sessions"],
  (client, cursor) => client.sessions.list({ cursor }),
);
`,
    },
    since: "0.1.0",
  },
  {
    id: "use-subscription",
    name: "useSubscription()",
    signature: "function useSubscription<T>(pattern: string, handler: EventHandler<T>): void",
    description:
      "Subscribes to any real client event for the component's lifetime, unsubscribing automatically on unmount — the real equivalent of a generic subscription hook, wired to genuine KvlClient events (request lifecycle, auth, real-time), not a fabricated protocol.",
    params: [
      {
        name: "pattern",
        type: "string",
        required: true,
        description: 'An exact event name, "namespace.*", or "*".',
      },
      {
        name: "handler",
        type: "EventHandler<T>",
        required: true,
        description: "Always the latest render's handler is called.",
      },
    ],
    returns: { type: "void", description: "No return value." },
    example: {
      language: "tsx",
      filename: "Toasts.tsx",
      code: `import { useSubscription } from "@kvl/react";

useSubscription("request.error", ({ error }) => toast.error(error.message));
`,
    },
    since: "0.1.0",
  },
  {
    id: "use-realtime",
    name: "useRealtime()",
    signature:
      "function useRealtime(sessionId: string | undefined): { isConnected: boolean; lastEvent: RealtimeEvent | null }",
    description:
      "Connects to the real tracking-session SSE stream for as long as the component is mounted with a given sessionId, disconnecting automatically on unmount or when sessionId changes. No presence or typing-indicator data — this app has no such server-side capability, and this hook never fabricates it.",
    params: [
      {
        name: "sessionId",
        type: "string | undefined",
        required: true,
        description: "Pass undefined to stay disconnected.",
      },
    ],
    returns: {
      type: "{ isConnected, lastEvent }",
      description: "Real connection status and the most recent real tracking event.",
    },
    example: {
      language: "tsx",
      filename: "LiveSession.tsx",
      code: `import { useRealtime } from "@kvl/react";

const { isConnected, lastEvent } = useRealtime(session.id);
`,
    },
    since: "0.1.0",
  },
  {
    id: "use-current-user",
    name: "useCurrentUser()",
    signature: "function useCurrentUser(): UseQueryResult<User>",
    description: "The real signed-in user — GET /users/me, via useQuery.",
    params: [],
    returns: { type: "UseQueryResult<User>", description: "The real user object once resolved." },
    example: {
      language: "tsx",
      filename: "Avatar.tsx",
      code: `import { useCurrentUser } from "@kvl/react";

const { data: user } = useCurrentUser();
`,
    },
    since: "0.1.0",
  },
  {
    id: "use-login",
    name: "useLogin()",
    signature:
      "function useLogin(): UseMutationResult<LoginResult, unknown, { email: string; password: string }>",
    description:
      "Real POST /auth/login as a mutation. Invalidates every cached query on success, since a new session means every previously-fetched org-scoped result is stale.",
    params: [],
    returns: {
      type: "UseMutationResult",
      description: "mutate({ email, password }), isSuccess, ...",
    },
    example: {
      language: "tsx",
      filename: "LoginForm.tsx",
      code: `import { useLogin } from "@kvl/react";

const login = useLogin();
await login.mutateAsync({ email, password });
`,
    },
    since: "0.1.0",
  },
];

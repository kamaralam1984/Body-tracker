/**
 * Real release history for `@kvl/sdk` / `@kvl/react`, newest first.
 * There is exactly one real release so far — this is a first-party SDK
 * built directly against the live REST API, not a product with prior
 * versions to relate.
 */

import type { ChangelogEntry } from "../types";

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.1.0",
    date: "2026-07-26",
    changes: [
      {
        kind: "feature",
        description:
          "First real release. Full REST API coverage across 13 resource areas (sessions, tracking, analytics, reports, webhooks, API keys, organizations, users, service accounts, OAuth2, notifications, Security Center, platform admin), generated against the live OpenAPI schema.",
      },
      {
        kind: "feature",
        description:
          "Real auth: API keys, a real login/logout Bearer session with automatic refresh-and-retry on 401, and OAuth2 authorization-code + PKCE support.",
      },
      {
        kind: "feature",
        description:
          "Real-time client wrapping the actual SSE tracking-event stream, with real auto-reconnect (exponential backoff).",
      },
      {
        kind: "feature",
        description:
          "Real single-file upload client (avatar upload) with real progress events in the browser.",
      },
      {
        kind: "feature",
        description:
          "@kvl/react: KvlProvider plus useQuery/useMutation/useInfiniteQuery/useSubscription/useRealtime and real domain hooks, built on @tanstack/react-query.",
      },
      {
        kind: "feature",
        description:
          "ESM + CommonJS + a minified CDN/UMD bundle, all with source maps; a real custom event emitter (on/once/off/wildcards/namespaces/priorities); real exponential-backoff retry and a circuit breaker.",
      },
    ],
  },
];

/**
 * Real API reference content for `@kvl/sdk`'s `KvlClient` — one
 * `ApiMethodDoc` per core member. This covers the client's own surface
 * (construction, auth, the low-level request escape hatch, middleware);
 * the ~80 individual resource methods (`client.sessions.*`,
 * `client.apiKeys.*`, etc. across all 13 resource namespaces) are
 * intentionally NOT each given their own card here — that's better
 * served by real TypeDoc-style generation from `packages/sdk/src/**`
 * directly (a real, deferred follow-up, not fabricated content) rather
 * than hand-duplicating ~80 signatures that would drift from the actual
 * source. Every resource namespace IS demonstrated with a real, runnable
 * example below and in `/docs/examples`.
 *
 * Rendered by `src/app/docs/api-reference/page.tsx` via `<ApiCard doc={...} />`.
 */

import type { ApiMethodDoc } from "../types";

export const API_METHODS: ApiMethodDoc[] = [
  {
    id: "constructor",
    kind: "constructor",
    name: "new KvlClient()",
    signature: "new KvlClient(config: KvlClientConfig)",
    description:
      "Creates a real client. Construction is synchronous — it validates config, sets up the token store, transport, retry/circuit-breaker, and instantiates every resource namespace (client.sessions, client.apiKeys, ...). No network request happens until you call a method.",
    params: [
      {
        name: "config",
        type: "KvlClientConfig",
        required: true,
        description:
          "baseUrl (defaults to the relative /api/v1 in a browser; required outside a browser), auth (apiKey | bearer | none), and optional fetch/retry/circuitBreaker/timeoutMs/middleware overrides.",
      },
    ],
    returns: {
      type: "KvlClient",
      description: "A new client instance, ready to call resource methods on immediately.",
    },
    throws: [
      {
        type: "Error",
        description:
          "Thrown synchronously if baseUrl is omitted while running outside a browser (there's no same-origin default to fall back to in Node).",
      },
    ],
    examples: [
      {
        language: "typescript",
        filename: "client.ts",
        code: `import { KvlClient } from "@kvl/sdk";

// Browser, same origin — baseUrl can be omitted:
const client = new KvlClient({ auth: { type: "none" } });

// Node, or a different origin — baseUrl is required:
const client = new KvlClient({
  baseUrl: "https://bodytracker.kvlbusinesssolutions.com/api/v1",
  auth: { type: "apiKey", apiKey: process.env.KVL_API_KEY! },
});
`,
      },
    ],
    notes: [
      "Three real auth modes: apiKey (server-to-server, never refreshed), bearer (a real JWT session, auto-refreshed on 401), and none (starts signed out — call client.login()).",
    ],
    since: "0.1.0",
  },
  {
    id: "login",
    kind: "method",
    name: "login()",
    signature: "login(email: string, password: string): Promise<LoginResult>",
    description:
      "Real POST /auth/login. Establishes a session the same way this app's own frontend does, and stores the resulting access/refresh tokens in the configured TokenStore (localStorage in a browser, in-memory in Node unless you supply your own). Not available in apiKey mode.",
    params: [
      { name: "email", type: "string", required: true, description: "The account's real email." },
      {
        name: "password",
        type: "string",
        required: true,
        description: "The account's real password.",
      },
    ],
    returns: {
      type: "Promise<LoginResult>",
      description:
        "Resolves with the real accessToken/refreshToken/expiresIn and the signed-in user.",
    },
    throws: [
      {
        type: "KvlApiError",
        description: 'A real 401 with code "unauthorized" on wrong credentials.',
      },
    ],
    examples: [
      {
        language: "typescript",
        filename: "login.ts",
        code: `const client = new KvlClient({ auth: { type: "none" } });

const { user } = await client.login("owner@example.com", "correct-password");
console.log("Signed in as", user.email);

// Every subsequent call is now authenticated:
const me = await client.users.me();
`,
      },
    ],
    since: "0.1.0",
  },
  {
    id: "logout",
    kind: "method",
    name: "logout()",
    signature: "logout(): Promise<void>",
    description:
      "Real POST /auth/logout — revokes the refresh token server-side (best-effort; a network failure here still clears the local session) — then clears the local session state.",
    params: [],
    returns: { type: "Promise<void>", description: "Resolves once the local session is cleared." },
    examples: [
      {
        language: "typescript",
        filename: "logout.ts",
        code: `await client.logout();
// client.users.me() now throws a real 401 until you log in again.
`,
      },
    ],
    since: "0.1.0",
  },
  {
    id: "request",
    kind: "method",
    name: "request()",
    signature: "request<T>(options: RequestOptions): Promise<T>",
    description:
      "The low-level method every resource client (client.sessions, client.apiKeys, ...) calls internally — public so you can hit a real endpoint this SDK version hasn't wrapped yet without losing auth, retry, or middleware. Real auth-header injection, one automatic refresh-and-retry on a 401, real exponential-backoff retry + circuit breaker, and real middleware hooks all apply.",
    params: [
      {
        name: "options",
        type: "RequestOptions",
        required: true,
        description: "method, path, and optional query/body/formData/signal/headers.",
      },
    ],
    returns: {
      type: "Promise<T>",
      description: "The server's real {data} envelope, already unwrapped to just the payload.",
    },
    throws: [
      {
        type: "KvlApiError",
        description: "A real non-2xx response, with the server's real code/status/message.",
      },
      { type: "KvlNetworkError", description: "The request never got a response at all." },
      { type: "KvlTimeoutError", description: "The configured timeoutMs elapsed." },
    ],
    examples: [
      {
        language: "typescript",
        filename: "request.ts",
        code: `const raw = await client.request<{ status: string }>({
  method: "GET",
  path: "/health",
});
`,
      },
    ],
    since: "0.1.0",
  },
  {
    id: "use",
    kind: "method",
    name: "use()",
    signature: "use(middleware: Middleware): void",
    description:
      "Registers real request middleware after construction — beforeRequest/afterResponse/onError hooks that run around every real request. See loggingMiddleware() for a ready-made example.",
    params: [
      {
        name: "middleware",
        type: "Middleware",
        required: true,
        description: "The hooks to register.",
      },
    ],
    returns: { type: "void", description: "No return value." },
    examples: [
      {
        language: "typescript",
        filename: "middleware.ts",
        code: `import { loggingMiddleware } from "@kvl/sdk";

client.use(loggingMiddleware());
client.use({
  onError: ({ request, error }) => reportToSentry(error, { request }),
});
`,
      },
    ],
    since: "0.1.0",
  },
  {
    id: "on",
    kind: "method",
    name: "on()",
    signature: "on(pattern: string, handler: EventHandler, options?: ListenOptions): () => void",
    description:
      'Subscribes to real client events — request lifecycle (request.start/request.success/request.error), auth (auth.session_updated/auth.session_cleared), and anything the real-time client emits (tracking.event, tracking.<type>, connected, disconnected, heartbeat, closed). Supports exact names, "namespace.*" wildcards, and "*" for everything. Returns an unsubscribe function.',
    params: [
      {
        name: "pattern",
        type: "string",
        required: true,
        description: 'An exact event name, "namespace.*", or "*".',
      },
      {
        name: "handler",
        type: "EventHandler",
        required: true,
        description: "Called with (payload, eventName).",
      },
      {
        name: "options",
        type: "ListenOptions",
        required: false,
        description: "{ priority?: number } — higher runs first.",
      },
    ],
    returns: { type: "() => void", description: "Call to remove exactly this handler." },
    examples: [
      {
        language: "typescript",
        filename: "events.ts",
        code: `client.on("request.error", ({ error }) => console.error(error));
client.on("tracking.rep", (payload) => console.log("new rep!", payload));
client.on("*", (payload, eventName) => console.debug(eventName, payload));
`,
      },
    ],
    since: "0.1.0",
  },
];

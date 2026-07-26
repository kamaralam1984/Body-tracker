/**
 * Real reference content for every event `KvlClient`/`RealtimeClient`
 * actually emits. Subscribe with `client.on(event, handler)` (returns an
 * unsubscribe function) or, in React, `useSubscription(event, handler)`.
 * Grouped by `category` and rendered by `src/app/docs/events/page.tsx`.
 */

import type { EventDoc } from "../types";

export const SDK_EVENTS: EventDoc[] = [
  {
    id: "request-start",
    name: "request.start",
    category: "lifecycle",
    payloadType: "{ method: string; url: string; attempt: number }",
    payloadFields: [
      { name: "method", type: "string", required: true, description: "The real HTTP method." },
      { name: "url", type: "string", required: true, description: "The real full request URL." },
      {
        name: "attempt",
        type: "number",
        required: true,
        description: "0 on the first try, incremented on each retry.",
      },
    ],
    description: "Fires right before every real request is sent — including retries.",
    example: {
      language: "typescript",
      filename: "request-start.ts",
      code: `client.on("request.start", ({ method, url }) => console.debug(\`→ \${method} \${url}\`));
`,
    },
  },
  {
    id: "request-success",
    name: "request.success",
    category: "lifecycle",
    payloadType: "{ method: string; url: string; status: number; durationMs: number }",
    payloadFields: [
      { name: "status", type: "number", required: true, description: "The real HTTP status code." },
      {
        name: "durationMs",
        type: "number",
        required: true,
        description: "Real wall-clock request duration.",
      },
    ],
    description: "Fires after a real 2xx response.",
    example: {
      language: "typescript",
      filename: "request-success.ts",
      code: `client.on("request.success", ({ status, durationMs }) => console.debug(status, durationMs));
`,
    },
  },
  {
    id: "request-error",
    name: "request.error",
    category: "error",
    payloadType:
      "{ method: string; url: string; error: KvlApiError | KvlNetworkError | KvlTimeoutError }",
    payloadFields: [
      {
        name: "error",
        type: "KvlApiError | KvlNetworkError | KvlTimeoutError",
        required: true,
        description: "The real error that was thrown.",
      },
    ],
    description:
      "Fires on every real request failure — a non-2xx response, a network failure, or a timeout.",
    example: {
      language: "typescript",
      filename: "request-error.ts",
      code: `client.on("request.error", ({ error }) => reportToSentry(error));
`,
    },
  },
  {
    id: "auth-session-updated",
    name: "auth.session_updated",
    category: "session",
    payloadType: "{ accessToken: string; refreshToken: string }",
    payloadFields: [
      {
        name: "accessToken",
        type: "string",
        required: true,
        description: "The real new access token.",
      },
      {
        name: "refreshToken",
        type: "string",
        required: true,
        description: "The real new refresh token.",
      },
    ],
    description: "Fires after login(), or after a real automatic token refresh.",
    example: {
      language: "typescript",
      filename: "session-updated.ts",
      code: `client.on("auth.session_updated", (tokens) => myOwnStorage.save(tokens));
`,
    },
  },
  {
    id: "auth-session-cleared",
    name: "auth.session_cleared",
    category: "session",
    payloadType: "undefined",
    payloadFields: [],
    description:
      "Fires after logout(), or after a real refresh attempt fails (the session could not be recovered).",
    example: {
      language: "typescript",
      filename: "session-cleared.ts",
      code: `client.on("auth.session_cleared", () => router.push("/login"));
`,
    },
  },
  {
    id: "realtime-connected",
    name: "connected",
    category: "tracking",
    payloadType: "{ sessionId: string }",
    payloadFields: [
      {
        name: "sessionId",
        type: "string",
        required: true,
        description: "The real tracking session id.",
      },
    ],
    description:
      "Fires on client.realtime once the real SSE connection to a tracking session opens.",
    example: {
      language: "typescript",
      filename: "connected.ts",
      code: `client.realtime.on("connected", ({ sessionId }) => console.log("live:", sessionId));
`,
    },
  },
  {
    id: "tracking-event",
    name: "tracking.event",
    category: "tracking",
    payloadType: "{ id: string; sessionId: string; type: string; ... }",
    payloadFields: [
      {
        name: "type",
        type: "string",
        required: true,
        description: 'The real tracking event type, e.g. "rep", "form_alert".',
      },
    ],
    description:
      "Fires for every real tracking event pushed over the SSE stream (also emitted as tracking.<type> individually, e.g. tracking.rep).",
    example: {
      language: "typescript",
      filename: "tracking-event.ts",
      code: `client.realtime.connect(session.id);
client.realtime.on("tracking.rep", (payload) => console.log("new rep", payload));
`,
    },
  },
  {
    id: "realtime-closed",
    name: "closed",
    category: "tracking",
    payloadType: "{ sessionId: string }",
    payloadFields: [
      { name: "sessionId", type: "string", required: true, description: "The session that ended." },
    ],
    description:
      "Fires when the server ends the real SSE stream on purpose (the tracking session completed) — not a connection drop, so this does not trigger auto-reconnect.",
    example: {
      language: "typescript",
      filename: "closed.ts",
      code: `client.realtime.on("closed", ({ sessionId }) => console.log("session ended:", sessionId));
`,
    },
  },
  {
    id: "realtime-reconnecting",
    name: "reconnecting",
    category: "tracking",
    payloadType: "{ sessionId: string; attempt: number; delayMs: number }",
    payloadFields: [
      {
        name: "attempt",
        type: "number",
        required: true,
        description: "Real reconnect attempt count.",
      },
      {
        name: "delayMs",
        type: "number",
        required: true,
        description: "Real exponential-backoff delay before the next attempt.",
      },
    ],
    description:
      "Fires when a real connection drop (not a server-initiated close) triggers automatic reconnection.",
    example: {
      language: "typescript",
      filename: "reconnecting.ts",
      code: `client.realtime.on("reconnecting", ({ attempt, delayMs }) => console.log(\`retry \${attempt} in \${delayMs}ms\`));
`,
    },
  },
];

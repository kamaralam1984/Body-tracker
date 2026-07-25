import type { OpenApiDocument } from "@/server/openapi/document";

/**
 * OpenAPI path fragment for the Tracking domain (`/api/v1/tracking/{sessionId}/*`).
 * Merged into the platform-wide document via `mergePaths`.
 */

const trackingSessionSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    orgId: { type: "string" },
    userId: { type: "string" },
    title: { type: "string" },
    activityKind: { type: "string" },
    status: { type: "string", enum: ["idle", "active", "paused", "completed"] },
    startedAt: { type: "string" },
    pausedAt: { type: ["string", "null"] },
    endedAt: { type: ["string", "null"] },
    durationSeconds: { type: "number" },
    repCount: { type: "number" },
    caloriesEstimate: { type: "number" },
    avgFormScore: { type: "number" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

const trackingEventSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    sessionId: { type: "string" },
    type: {
      type: "string",
      enum: ["started", "paused", "resumed", "rep", "form-alert", "completed"],
    },
    message: { type: "string" },
    data: { type: "object", additionalProperties: { type: ["string", "number"] } },
    createdAt: { type: "string" },
  },
};

const errorResponse = {
  description: "Error",
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
};

const security = [{ bearerAuth: [] }, { apiKeyAuth: [] }];

const sessionIdParam = {
  name: "sessionId",
  in: "path",
  required: true,
  schema: { type: "string" },
};

const sessionResponse = (description: string) => ({
  "200": {
    description,
    content: {
      "application/json": {
        schema: { type: "object", properties: { data: trackingSessionSchema } },
      },
    },
  },
  "401": errorResponse,
  "403": errorResponse,
  "404": errorResponse,
  "409": errorResponse,
});

export const trackingPaths: OpenApiDocument["paths"] = {
  "/tracking/{sessionId}/start": {
    post: {
      tags: ["Tracking"],
      summary: "Start an idle tracking session",
      security,
      parameters: [sessionIdParam],
      responses: sessionResponse("The now-active session."),
    },
  },
  "/tracking/{sessionId}/pause": {
    post: {
      tags: ["Tracking"],
      summary: "Pause an active tracking session",
      security,
      parameters: [sessionIdParam],
      responses: sessionResponse("The now-paused session."),
    },
  },
  "/tracking/{sessionId}/resume": {
    post: {
      tags: ["Tracking"],
      summary: "Resume a paused tracking session",
      security,
      parameters: [sessionIdParam],
      responses: sessionResponse("The now-active session."),
    },
  },
  "/tracking/{sessionId}/stop": {
    post: {
      tags: ["Tracking"],
      summary: "Stop an active or paused tracking session, finalizing its duration",
      security,
      parameters: [sessionIdParam],
      responses: sessionResponse("The now-completed session."),
    },
  },
  "/tracking/{sessionId}/rep": {
    post: {
      tags: ["Tracking"],
      summary: "Record a rep for an active tracking session",
      security,
      parameters: [sessionIdParam],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { formScore: { type: "number", minimum: 0, maximum: 100 } },
            },
          },
        },
      },
      responses: sessionResponse("The session with the rep applied."),
    },
  },
  "/tracking/{sessionId}/status": {
    get: {
      tags: ["Tracking"],
      summary: "Get a session's current state plus its most recent tracking events",
      security,
      parameters: [sessionIdParam],
      responses: {
        "200": {
          description: "The session and its 20 most recent tracking events, newest first.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      session: trackingSessionSchema,
                      recentEvents: { type: "array", items: trackingEventSchema },
                    },
                  },
                },
              },
            },
          },
        },
        "401": errorResponse,
        "403": errorResponse,
        "404": errorResponse,
      },
    },
  },
  "/tracking/{sessionId}/stream": {
    get: {
      tags: ["Tracking"],
      summary: "Realtime Server-Sent-Events stream of a session's tracking events",
      description:
        "A standards-based, one-directional server-to-client SSE stream. Accepts `Authorization: Bearer <jwt>` " +
        "or, since browsers' native `EventSource` cannot set custom headers, a `?access_token=<jwt>` query " +
        "parameter fallback. Emits `data:` frames of TrackingEvent JSON as they occur, periodic `event: ping` " +
        "heartbeats, and a final `event: closed` frame once the session completes.",
      security,
      parameters: [
        sessionIdParam,
        {
          name: "access_token",
          in: "query",
          required: false,
          description:
            "JWT access token, used when an Authorization header cannot be set (e.g. browser EventSource).",
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          description: "An open `text/event-stream` connection.",
          content: { "text/event-stream": { schema: { type: "string" } } },
        },
        "401": errorResponse,
        "404": errorResponse,
      },
    },
  },
};

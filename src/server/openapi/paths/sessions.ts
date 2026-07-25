import type { OpenApiDocument } from "@/server/openapi/document";

/**
 * OpenAPI path fragment for the Sessions domain (`/api/v1/sessions`).
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

const errorResponse = {
  description: "Error",
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
};

const security = [{ bearerAuth: [] }, { apiKeyAuth: [] }];

export const sessionsPaths: OpenApiDocument["paths"] = {
  "/sessions": {
    get: {
      tags: ["Sessions"],
      summary: "List tracking sessions for the caller's organization",
      security,
      parameters: [
        {
          name: "status",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["idle", "active", "paused", "completed"] },
        },
        { name: "activityKind", in: "query", required: false, schema: { type: "string" } },
        { name: "cursor", in: "query", required: false, schema: { type: "string" } },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 100 },
        },
      ],
      responses: {
        "200": {
          description: "A page of tracking sessions, newest first.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      items: { type: "array", items: trackingSessionSchema },
                      nextCursor: { type: ["string", "null"] },
                      total: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
        "401": errorResponse,
        "403": errorResponse,
        "422": errorResponse,
      },
    },
    post: {
      tags: ["Sessions"],
      summary: "Create a new tracking session (starts in `idle` status)",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["title", "activityKind"],
              properties: {
                title: { type: "string", minLength: 1 },
                activityKind: { type: "string", minLength: 1 },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "The created session.",
          content: {
            "application/json": {
              schema: { type: "object", properties: { data: trackingSessionSchema } },
            },
          },
        },
        "401": errorResponse,
        "403": errorResponse,
        "422": errorResponse,
      },
    },
  },
  "/sessions/{id}": {
    get: {
      tags: ["Sessions"],
      summary: "Get a tracking session by id",
      security,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "The session.",
          content: {
            "application/json": {
              schema: { type: "object", properties: { data: trackingSessionSchema } },
            },
          },
        },
        "401": errorResponse,
        "403": errorResponse,
        "404": errorResponse,
      },
    },
    patch: {
      tags: ["Sessions"],
      summary: "Update a tracking session's title",
      security,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", properties: { title: { type: "string", minLength: 1 } } },
          },
        },
      },
      responses: {
        "200": {
          description: "The updated session.",
          content: {
            "application/json": {
              schema: { type: "object", properties: { data: trackingSessionSchema } },
            },
          },
        },
        "401": errorResponse,
        "403": errorResponse,
        "404": errorResponse,
        "422": errorResponse,
      },
    },
    delete: {
      tags: ["Sessions"],
      summary: "Delete a tracking session and its tracking events",
      security,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "Deletion confirmation.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: { id: { type: "string" }, deleted: { type: "boolean" } },
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
};

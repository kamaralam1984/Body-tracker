import type { OpenApiDocument } from "@/server/openapi/document";
import { paramsFromZodObject, schemaRef } from "@/server/openapi/schema-registry";
import {
  createSchema as sessionCreateSchema,
  listQuerySchema as sessionsListQuerySchema,
} from "@/app/api/v1/sessions/route";
import { patchSchema as sessionPatchSchema } from "@/app/api/v1/sessions/[id]/route";

/**
 * OpenAPI path fragment for the Sessions domain (`/api/v1/sessions`).
 * Merged into the platform-wide document via `mergePaths`. Request-side
 * schemas (`requestBody`, query `parameters`) are derived from the actual
 * Zod validators in `src/app/api/v1/sessions/**` via `schemaRef`/
 * `paramsFromZodObject`, so they can't drift from what the route really
 * accepts.
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
      parameters: paramsFromZodObject(sessionsListQuerySchema, "query"),
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
          "application/json": { schema: schemaRef("SessionCreateRequest", sessionCreateSchema) },
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
          "application/json": { schema: schemaRef("SessionPatchRequest", sessionPatchSchema) },
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

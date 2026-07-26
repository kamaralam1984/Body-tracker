import type { OpenApiDocument } from "@/server/openapi/document";
import { paramsFromZodObject, schemaRef } from "@/server/openapi/schema-registry";
import { listQuerySchema as notificationsListQuerySchema } from "@/app/api/v1/notifications/route";
import { patchSchema as notificationsPatchSchema } from "@/app/api/v1/notifications/[id]/route";

const errorResponse = {
  description: "Error response",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const notificationSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    orgId: { type: "string" },
    userId: { type: "string" },
    type: { type: "string" },
    title: { type: "string" },
    body: { type: "string" },
    read: { type: "boolean" },
    metadata: { type: ["object", "null"] },
    createdAt: { type: "string", format: "date-time" },
  },
};

export const notificationsPaths: OpenApiDocument["paths"] = {
  "/notifications": {
    get: {
      tags: ["Notifications"],
      summary: "List the caller's own real in-app notifications",
      description:
        "Always self-scoped by the caller's own userId — never scope-gated, the same way /users/me isn't, since a notification is inherently personal.",
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      parameters: paramsFromZodObject(notificationsListQuerySchema, "query"),
      responses: {
        "200": {
          description: "Paginated list of the caller's notifications, plus a real unread count",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      items: { type: "array", items: notificationSchema },
                      nextCursor: { type: ["string", "null"] },
                      total: { type: "integer" },
                      unreadCount: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
        default: errorResponse,
      },
    },
  },
  "/notifications/{id}": {
    patch: {
      tags: ["Notifications"],
      summary: "Mark a single notification read or unread",
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: schemaRef("NotificationPatchRequest", notificationsPatchSchema),
          },
        },
      },
      responses: {
        "200": {
          description: "The updated notification",
          content: {
            "application/json": {
              schema: { type: "object", properties: { data: notificationSchema } },
            },
          },
        },
        default: errorResponse,
      },
    },
  },
  "/notifications/read-all": {
    post: {
      tags: ["Notifications"],
      summary: "Mark all of the caller's unread notifications as read",
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      responses: {
        "200": {
          description: "Count of notifications marked read",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: { type: "object", properties: { updated: { type: "integer" } } },
                },
              },
            },
          },
        },
        default: errorResponse,
      },
    },
  },
};

import type { OpenApiDocument } from "@/server/openapi/document";
import { paramsFromZodObject, schemaRef } from "@/server/openapi/schema-registry";
import {
  createSchema as webhookCreateSchema,
  listQuerySchema as webhooksListQuerySchema,
} from "@/app/api/v1/webhooks/route";
import { patchSchema as webhookPatchSchema } from "@/app/api/v1/webhooks/[id]/route";
import { testSchema as webhookTestSchema } from "@/app/api/v1/webhooks/[id]/test/route";
import { listQuerySchema as deliveriesListQuerySchema } from "@/app/api/v1/webhooks/[id]/deliveries/route";

/**
 * OpenAPI path definitions for the Webhooks domain.
 * See src/app/api/v1/webhooks/** for the corresponding route handlers.
 * Request-side schemas (`requestBody`, query `parameters`) are derived from
 * the actual Zod validators via `schemaRef`/`paramsFromZodObject`, so they
 * can't drift from what the route really accepts. Response-body schemas
 * below (e.g. `webhookSchema`, `webhookDeliverySchema`) remain hand-typed.
 */

const security = [{ bearerAuth: [] }, { apiKeyAuth: [] }];

const errorResponseRef = { $ref: "#/components/schemas/Error" };

const webhookEventSchema = {
  type: "string",
  enum: [
    "session.started",
    "session.completed",
    "tracking.form-alert",
    "report.ready",
    "user.invited",
  ],
};

const webhookSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    orgId: { type: "string" },
    url: { type: "string", format: "uri" },
    secret: {
      type: "string",
      description: "Only present in the response to the create-webhook call.",
    },
    events: { type: "array", items: webhookEventSchema },
    status: { type: "string", enum: ["active", "disabled"] },
    createdAt: { type: "string", format: "date-time" },
  },
};

const webhookDeliverySchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    webhookId: { type: "string" },
    event: webhookEventSchema,
    payload: { type: "object" },
    attempt: { type: "integer" },
    status: { type: "string", enum: ["pending", "success", "failed"] },
    responseStatus: { type: ["integer", "null"] },
    durationMs: { type: ["integer", "null"] },
    createdAt: { type: "string", format: "date-time" },
  },
};

const idParam = {
  name: "id",
  in: "path" as const,
  required: true,
  schema: { type: "string" },
  description: "Webhook ID",
};

export const webhooksPaths: OpenApiDocument["paths"] = {
  "/webhooks": {
    get: {
      tags: ["Webhooks"],
      summary: "List webhooks for the caller's organization",
      security,
      parameters: paramsFromZodObject(webhooksListQuerySchema, "query"),
      responses: {
        "200": {
          description: "A page of webhooks (secrets omitted).",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { data: { type: "array", items: webhookSchema } },
              },
            },
          },
        },
        default: {
          description: "Error",
          content: { "application/json": { schema: errorResponseRef } },
        },
      },
    },
    post: {
      tags: ["Webhooks"],
      summary: "Register a new webhook",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: schemaRef("WebhookCreateRequest", webhookCreateSchema) },
        },
      },
      responses: {
        "201": {
          description: "Webhook created. The `secret` field is only ever returned in full here.",
          content: {
            "application/json": { schema: { type: "object", properties: { data: webhookSchema } } },
          },
        },
        default: {
          description: "Error",
          content: { "application/json": { schema: errorResponseRef } },
        },
      },
    },
  },
  "/webhooks/{id}": {
    get: {
      tags: ["Webhooks"],
      summary: "Get a webhook by ID",
      security,
      parameters: [idParam],
      responses: {
        "200": {
          description: "The webhook (secret omitted).",
          content: {
            "application/json": { schema: { type: "object", properties: { data: webhookSchema } } },
          },
        },
        default: {
          description: "Error",
          content: { "application/json": { schema: errorResponseRef } },
        },
      },
    },
    patch: {
      tags: ["Webhooks"],
      summary: "Update a webhook's URL, subscribed events, or status",
      security,
      parameters: [idParam],
      requestBody: {
        required: false,
        content: {
          "application/json": { schema: schemaRef("WebhookPatchRequest", webhookPatchSchema) },
        },
      },
      responses: {
        "200": {
          description: "The updated webhook (secret omitted).",
          content: {
            "application/json": { schema: { type: "object", properties: { data: webhookSchema } } },
          },
        },
        default: {
          description: "Error",
          content: { "application/json": { schema: errorResponseRef } },
        },
      },
    },
    delete: {
      tags: ["Webhooks"],
      summary: "Delete a webhook and its delivery history",
      security,
      parameters: [idParam],
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
                    properties: { deleted: { type: "boolean" }, id: { type: "string" } },
                  },
                },
              },
            },
          },
        },
        default: {
          description: "Error",
          content: { "application/json": { schema: errorResponseRef } },
        },
      },
    },
  },
  "/webhooks/{id}/deliveries": {
    get: {
      tags: ["Webhooks"],
      summary: "List delivery attempts for a webhook, newest first",
      security,
      parameters: [idParam, ...paramsFromZodObject(deliveriesListQuerySchema, "query")],
      responses: {
        "200": {
          description: "A page of webhook deliveries.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { data: { type: "array", items: webhookDeliverySchema } },
              },
            },
          },
        },
        default: {
          description: "Error",
          content: { "application/json": { schema: errorResponseRef } },
        },
      },
    },
  },
  "/webhooks/{id}/test": {
    post: {
      tags: ["Webhooks"],
      summary: "Send a real test delivery for a webhook",
      description:
        "Builds a sample payload for one of the webhook's subscribed events, signs it, and performs a genuine HTTP POST to the webhook's URL. Records and returns the delivery outcome (including network failures and non-2xx responses) as a normal, successful API call.",
      security,
      parameters: [idParam],
      requestBody: {
        required: false,
        content: {
          "application/json": { schema: schemaRef("WebhookTestRequest", webhookTestSchema) },
        },
      },
      responses: {
        "200": {
          description:
            "The recorded delivery attempt (status reflects the real outcome of the downstream request).",
          content: {
            "application/json": {
              schema: { type: "object", properties: { data: webhookDeliverySchema } },
            },
          },
        },
        default: {
          description: "Error",
          content: { "application/json": { schema: errorResponseRef } },
        },
      },
    },
  },
  "/webhooks/echo": {
    post: {
      tags: ["Webhooks"],
      summary: "Unauthenticated echo endpoint for testing webhook deliveries locally",
      description:
        "Convenience local test target with no auth requirement so webhook deliveries can be verified end-to-end without an external network dependency. Echoes back the received signature headers and JSON body.",
      security: [],
      responses: {
        "200": {
          description: "Echo of the received request.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      received: { type: "boolean" },
                      event: { type: ["string", "null"] },
                      signaturePresent: { type: "boolean" },
                      payload: {},
                    },
                  },
                },
              },
            },
          },
        },
        default: {
          description: "Error",
          content: { "application/json": { schema: errorResponseRef } },
        },
      },
    },
  },
};

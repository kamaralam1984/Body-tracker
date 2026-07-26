import type { OpenApiDocument } from "@/server/openapi/document";
import { paramsFromZodObject, schemaRef } from "@/server/openapi/schema-registry";
import {
  createSchema as serviceAccountCreateSchema,
  listQuerySchema as serviceAccountsListQuerySchema,
} from "@/app/api/v1/service-accounts/route";
import { patchSchema as serviceAccountPatchSchema } from "@/app/api/v1/service-accounts/[id]/route";
import {
  createSchema as serviceAccountKeyCreateSchema,
  listQuerySchema as serviceAccountKeysListQuerySchema,
} from "@/app/api/v1/service-accounts/[id]/api-keys/route";

const security = [{ bearerAuth: [] }, { apiKeyAuth: [] }];

const errorResponse = {
  description: "Error",
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
};

const idParam = {
  name: "id",
  in: "path" as const,
  required: true,
  description: "Service account id",
  schema: { type: "string" },
};

const serviceAccountSchema = {
  type: "object",
  description: "A machine identity, not a human — see prisma/schema.prisma's ServiceAccount model.",
  properties: {
    id: { type: "string" },
    orgId: { type: "string" },
    name: { type: "string" },
    status: { type: "string", enum: ["active", "revoked"] },
    createdAt: { type: "string", format: "date-time" },
  },
};

const serviceAccountKeySchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    orgId: { type: "string" },
    serviceAccountId: { type: "string" },
    name: { type: "string" },
    keyPrefix: { type: "string" },
    scopes: { type: "array", items: { type: "string" } },
    status: { type: "string", enum: ["active", "revoked"] },
    rateLimitPerMinute: { type: "integer" },
    requestCount: { type: "integer" },
    lastUsedAt: { type: ["string", "null"], format: "date-time" },
    createdAt: { type: "string", format: "date-time" },
    expiresAt: { type: ["string", "null"], format: "date-time" },
  },
};

export const serviceAccountsPaths: OpenApiDocument["paths"] = {
  "/service-accounts": {
    get: {
      tags: ["Service Accounts"],
      summary: "List service accounts in the caller's organization",
      security,
      parameters: paramsFromZodObject(serviceAccountsListQuerySchema, "query"),
      responses: {
        "200": {
          description: "Paginated list of service accounts",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      items: { type: "array", items: serviceAccountSchema },
                      nextCursor: { type: ["string", "null"] },
                      total: { type: "integer" },
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
    post: {
      tags: ["Service Accounts"],
      summary: "Create a service account",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: schemaRef("ServiceAccountCreateRequest", serviceAccountCreateSchema),
          },
        },
      },
      responses: {
        "201": {
          description: "The created service account",
          content: {
            "application/json": {
              schema: { type: "object", properties: { data: serviceAccountSchema } },
            },
          },
        },
        default: errorResponse,
      },
    },
  },
  "/service-accounts/{id}": {
    patch: {
      tags: ["Service Accounts"],
      summary: "Update a service account's name or status (active/revoked)",
      security,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: schemaRef("ServiceAccountPatchRequest", serviceAccountPatchSchema),
          },
        },
      },
      responses: {
        "200": {
          description: "The updated service account",
          content: {
            "application/json": {
              schema: { type: "object", properties: { data: serviceAccountSchema } },
            },
          },
        },
        default: errorResponse,
      },
    },
    delete: {
      tags: ["Service Accounts"],
      summary: "Delete a service account and revoke all of its API keys",
      security,
      parameters: [idParam],
      responses: {
        "200": {
          description: "Deletion confirmation",
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
        default: errorResponse,
      },
    },
  },
  "/service-accounts/{id}/api-keys": {
    get: {
      tags: ["Service Accounts"],
      summary: "List API keys issued for a service account",
      security,
      parameters: [idParam, ...paramsFromZodObject(serviceAccountKeysListQuerySchema, "query")],
      responses: {
        "200": {
          description: "Paginated list of keys (secrets never included)",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      items: { type: "array", items: serviceAccountKeySchema },
                      nextCursor: { type: ["string", "null"] },
                      total: { type: "integer" },
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
    post: {
      tags: ["Service Accounts"],
      summary: "Issue a real machine-to-machine API key for a service account",
      description:
        "Scopes are exactly what's requested here, never inherited from a human role (a service account has no role) — see requireScope()/ROLE_SCOPES in src/server/http/principal.ts.",
      security,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: schemaRef("ServiceAccountApiKeyCreateRequest", serviceAccountKeyCreateSchema),
          },
        },
      },
      responses: {
        "201": {
          description: "API key created — plaintext secret returned once",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    allOf: [
                      { type: "object", properties: { apiKey: { type: "string" } } },
                      serviceAccountKeySchema,
                    ],
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
};

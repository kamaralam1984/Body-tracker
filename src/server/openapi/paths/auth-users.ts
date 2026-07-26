import type { OpenApiDocument } from "@/server/openapi/document";
import { paramsFromZodObject, schemaRef } from "@/server/openapi/schema-registry";
import { loginSchema } from "@/app/api/v1/auth/login/route";
import { refreshSchema } from "@/app/api/v1/auth/refresh/route";
import { logoutSchema } from "@/app/api/v1/auth/logout/route";
import { updateMeSchema } from "@/app/api/v1/users/me/route";
import { listQuerySchema as usersListQuerySchema } from "@/app/api/v1/users/route";
import {
  listQuerySchema as apiKeysListQuerySchema,
  createSchema as apiKeysCreateSchema,
} from "@/app/api/v1/api-keys/route";
import { rotateSchema } from "@/app/api/v1/api-keys/[id]/rotate/route";
import {
  patchSchema as apiKeysPatchSchema,
  revokeSchema as apiKeysRevokeSchema,
} from "@/app/api/v1/api-keys/[id]/route";

const errorResponse = {
  description: "Error response",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const userSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    orgId: { type: "string" },
    teamId: { type: ["string", "null"] },
    email: { type: "string", format: "email" },
    name: { type: "string" },
    role: { type: "string", enum: ["owner", "admin", "manager", "member", "viewer"] },
    status: { type: "string", enum: ["active", "invited", "suspended"] },
    createdAt: { type: "string", format: "date-time" },
  },
};

const authResultSchema = {
  type: "object",
  properties: {
    accessToken: { type: "string" },
    refreshToken: { type: "string" },
    expiresIn: { type: "integer" },
    user: userSchema,
  },
};

const apiKeySchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    orgId: { type: "string" },
    userId: { type: "string" },
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

export const authUsersPaths: OpenApiDocument["paths"] = {
  "/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Log in with email and password",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: schemaRef("AuthLoginRequest", loginSchema) },
        },
      },
      responses: {
        "200": {
          description: "Authenticated successfully",
          content: {
            "application/json": {
              schema: { type: "object", properties: { data: authResultSchema } },
            },
          },
        },
        default: errorResponse,
      },
    },
  },
  "/auth/refresh": {
    post: {
      tags: ["Auth"],
      summary: "Rotate a refresh token for a new access/refresh token pair",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: schemaRef("AuthRefreshRequest", refreshSchema) },
        },
      },
      responses: {
        "200": {
          description: "New token pair issued",
          content: {
            "application/json": {
              schema: { type: "object", properties: { data: authResultSchema } },
            },
          },
        },
        default: errorResponse,
      },
    },
  },
  "/auth/logout": {
    post: {
      tags: ["Auth"],
      summary: "Revoke a refresh token",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: schemaRef("AuthLogoutRequest", logoutSchema) },
        },
      },
      responses: {
        "200": {
          description: "Logged out (idempotent)",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: { type: "object", properties: { success: { type: "boolean" } } },
                },
              },
            },
          },
        },
        default: errorResponse,
      },
    },
  },
  "/users/me": {
    get: {
      tags: ["Users"],
      summary: "Get the current user's profile",
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      responses: {
        "200": {
          description: "The calling user's profile",
          content: {
            "application/json": { schema: { type: "object", properties: { data: userSchema } } },
          },
        },
        default: errorResponse,
      },
    },
    patch: {
      tags: ["Users"],
      summary: "Update the current user's profile",
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: schemaRef("UserUpdateRequest", updateMeSchema) },
        },
      },
      responses: {
        "200": {
          description: "Updated profile",
          content: {
            "application/json": { schema: { type: "object", properties: { data: userSchema } } },
          },
        },
        default: errorResponse,
      },
    },
  },
  "/users": {
    get: {
      tags: ["Users"],
      summary: "List users in the caller's organization",
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      parameters: paramsFromZodObject(usersListQuerySchema, "query"),
      responses: {
        "200": {
          description: "Paginated list of users",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      items: { type: "array", items: userSchema },
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
  },
  "/api-keys": {
    get: {
      tags: ["API Keys"],
      summary: "List API keys in the caller's organization",
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      parameters: paramsFromZodObject(apiKeysListQuerySchema, "query"),
      responses: {
        "200": {
          description: "Paginated list of API keys (secrets never included)",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      items: { type: "array", items: apiKeySchema },
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
      tags: ["API Keys"],
      summary: "Create a new API key",
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: schemaRef("ApiKeyCreateRequest", apiKeysCreateSchema) },
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
                      apiKeySchema,
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
  "/api-keys/{id}": {
    patch: {
      tags: ["API Keys"],
      summary: "Edit an API key's name or scopes",
      description:
        "Scopes were immutable after creation until now. Changing scopes writes a real 'api-key.permission_changed' audit event with the actual before/after scope arrays.",
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: schemaRef("ApiKeyPatchRequest", apiKeysPatchSchema) },
        },
      },
      responses: {
        "200": {
          description: "The updated API key",
          content: {
            "application/json": { schema: { type: "object", properties: { data: apiKeySchema } } },
          },
        },
        default: errorResponse,
      },
    },
    delete: {
      tags: ["API Keys"],
      summary: "Revoke an API key, with a reason",
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: false,
        content: {
          "application/json": { schema: schemaRef("ApiKeyRevokeRequest", apiKeysRevokeSchema) },
        },
      },
      responses: {
        "200": {
          description: "API key revoked",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: { type: "object", properties: { success: { type: "boolean" } } },
                },
              },
            },
          },
        },
        default: errorResponse,
      },
    },
  },
  "/api-keys/{id}/rotate": {
    post: {
      tags: ["API Keys"],
      summary: "Rotate an API key with a real grace period (not an instant swap)",
      description:
        "Creates a brand-new key (new secret, same scopes/limits/restrictions) and starts a grace-period countdown on the OLD key — both authenticate successfully until the grace period ends (default 24h, configurable via `graceHours` for testing), then the old one is automatically revoked by the sweep in src/instrumentation.ts.",
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: false,
        content: {
          "application/json": { schema: schemaRef("ApiKeyRotateRequest", rotateSchema) },
        },
      },
      responses: {
        "200": {
          description: "New key created — new plaintext secret returned once",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    allOf: [
                      {
                        type: "object",
                        properties: {
                          apiKey: { type: "string" },
                          oldKeyId: { type: "string" },
                          gracePeriodEndsAt: { type: "string", format: "date-time" },
                        },
                      },
                      apiKeySchema,
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
  "/api-keys/{id}/rotation-history": {
    get: {
      tags: ["API Keys"],
      summary: "Real rotation history for a key, derived from AuditLogEntry (not a separate table)",
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "Rotation events this key was involved in, newest first",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        rotatedAt: { type: "string", format: "date-time" },
                        rotatedBy: { type: ["string", "null"] },
                        newKeyId: { type: "string" },
                        oldKeyId: { type: ["string", "null"] },
                        gracePeriodEndsAt: { type: ["string", "null"], format: "date-time" },
                      },
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
};

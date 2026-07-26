import type { OpenApiDocument } from "@/server/openapi/document";
import { paramsFromZodObject } from "@/server/openapi/schema-registry";
import { listQuerySchema as platformOrgsListQuerySchema } from "@/app/api/v1/platform/organizations/route";
import { listQuerySchema as platformApiKeysListQuerySchema } from "@/app/api/v1/platform/api-keys/route";

const errorResponse = {
  description: "Error response",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const organizationSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    slug: { type: "string" },
    plan: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    userCount: { type: "integer" },
    apiKeyCount: { type: "integer" },
  },
};

export const platformAdminPaths: OpenApiDocument["paths"] = {
  "/platform/organizations": {
    get: {
      tags: ["Platform Admin"],
      summary: "List every real organization on the platform",
      description:
        "Requires a Bearer-token principal with `User.isPlatformAdmin = true` — gated by `requirePlatformAdmin()`, not a scope, since this is orthogonal to in-org roles/scopes. API-key principals can never satisfy this, by construction (see `resolvePrincipal`).",
      security: [{ bearerAuth: [] }],
      parameters: paramsFromZodObject(platformOrgsListQuerySchema, "query"),
      responses: {
        "200": {
          description: "Paginated list of every real organization",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      items: { type: "array", items: organizationSchema },
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
  "/platform/api-keys": {
    get: {
      tags: ["Platform Admin"],
      summary: "List every real API key across every organization",
      description:
        "Real cross-org data, each key annotated with its real owning organization's name/slug. Supports `?orgId=` to narrow to one org. Same `requirePlatformAdmin()` gate as `/platform/organizations`.",
      security: [{ bearerAuth: [] }],
      parameters: paramsFromZodObject(platformApiKeysListQuerySchema, "query"),
      responses: {
        "200": {
          description: "Paginated cross-org list of real API keys (secrets never included)",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      items: { type: "array", items: { type: "object" } },
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
  "/platform/api-keys/{id}": {
    delete: {
      tags: ["Platform Admin"],
      summary: "Revoke any organization's API key",
      description:
        "The one mutation exposed to platform admins — revocation only (not rotation, which stays a per-tenant self-service action). Writes a real audit event under the key's own org with `metadata.viaPlatformAdmin: true`, and notifies the key's real owner if it has one.",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
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
};

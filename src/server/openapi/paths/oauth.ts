import type { OpenApiDocument } from "@/server/openapi/document";
import { paramsFromZodObject, schemaRef } from "@/server/openapi/schema-registry";
import {
  createSchema as oauthClientCreateSchema,
  listQuerySchema as oauthClientsListQuerySchema,
} from "@/app/api/v1/oauth/clients/route";
import { authorizeQuerySchema, authorizeDecisionSchema } from "@/app/api/v1/oauth/authorize/route";
import { tokenGrantSchema } from "@/app/api/v1/oauth/token/route";

const security = [{ bearerAuth: [] }, { apiKeyAuth: [] }];

const errorResponse = {
  description: "Error",
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
};

const oauthClientSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    orgId: { type: "string" },
    name: { type: "string" },
    clientId: { type: "string" },
    redirectUris: { type: "array", items: { type: "string", format: "uri" } },
    scopes: { type: "array", items: { type: "string" } },
    createdAt: { type: "string", format: "date-time" },
    clientSecret: {
      type: "string",
      description: "Only present in the response to the create-client call — never returned again.",
    },
  },
};

const tokenResultSchema = {
  type: "object",
  properties: {
    accessToken: { type: "string" },
    refreshToken: { type: "string" },
    expiresIn: { type: "integer" },
    scope: { type: "string" },
    tokenType: { type: "string", enum: ["Bearer"] },
  },
};

export const oauthPaths: OpenApiDocument["paths"] = {
  "/oauth/clients": {
    get: {
      tags: ["OAuth"],
      summary: "List OAuth2 clients registered for the caller's organization",
      security,
      parameters: paramsFromZodObject(oauthClientsListQuerySchema, "query"),
      responses: {
        "200": {
          description: "Paginated list of OAuth clients (secrets never included)",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      items: { type: "array", items: oauthClientSchema },
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
      tags: ["OAuth"],
      summary: "Register a new OAuth2 client",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: schemaRef("OAuthClientCreateRequest", oauthClientCreateSchema),
          },
        },
      },
      responses: {
        "201": {
          description:
            "The registered client — `clientSecret` is only ever returned here, in full.",
          content: {
            "application/json": {
              schema: { type: "object", properties: { data: oauthClientSchema } },
            },
          },
        },
        default: errorResponse,
      },
    },
  },
  "/oauth/clients/{id}": {
    delete: {
      tags: ["OAuth"],
      summary: "Delete an OAuth2 client and its pending authorization codes",
      security,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
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
  "/oauth/authorize": {
    get: {
      tags: ["OAuth"],
      summary:
        "Look up an OAuth2 client's display name and grantable scopes (public, unauthenticated)",
      description:
        'Called by the real consent page (src/app/oauth/authorize/page.tsx) before the user is even asked to approve anything, so it can show "App X wants access to...". No secrets are exposed here.',
      security: [],
      parameters: paramsFromZodObject(authorizeQuerySchema, "query"),
      responses: {
        "200": {
          description:
            "The client's display name and which of the requested scopes it's actually registered for",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      clientName: { type: "string" },
                      requestedScopes: { type: "array", items: { type: "string" } },
                      grantableScopes: { type: "array", items: { type: "string" } },
                      ungrantableScopes: { type: "array", items: { type: "string" } },
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
      tags: ["OAuth"],
      summary: "Record the logged-in user's consent decision (approve/deny)",
      description:
        "Requires the approving user's own Bearer token. Granted scopes are the real intersection of what the client is registered for AND what the approving user's own role scopes allow — a user can never consent to handing out permissions they don't have themselves.",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: schemaRef("OAuthAuthorizeDecisionRequest", authorizeDecisionSchema),
          },
        },
      },
      responses: {
        "200": {
          description:
            "Where to redirect the browser next (with `code`+`state`, or `error=access_denied`)",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      redirectTo: { type: "string", format: "uri" },
                      grantedScopes: { type: "array", items: { type: "string" } },
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
  "/oauth/token": {
    post: {
      tags: ["OAuth"],
      summary:
        "Exchange an authorization code (with PKCE) or refresh token for real access/refresh tokens",
      description:
        "No Bearer/API-key auth on this route itself — the caller authenticates via `client_id`/`client_secret` (authorization_code grant) or the refresh token itself (refresh_token grant), the standard OAuth2 token-endpoint pattern (RFC 6749).",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: schemaRef("OAuthTokenGrantRequest", tokenGrantSchema) },
        },
      },
      responses: {
        "200": {
          description:
            "A real access/refresh token pair, scoped to what the user actually consented to",
          content: {
            "application/json": {
              schema: { type: "object", properties: { data: tokenResultSchema } },
            },
          },
        },
        default: errorResponse,
      },
    },
  },
};

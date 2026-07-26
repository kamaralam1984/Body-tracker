import type { OpenApiDocument } from "@/server/openapi/document";
import { paramsFromZodObject, schemaRef } from "@/server/openapi/schema-registry";
import { patchSchema as orgPatchSchema } from "@/app/api/v1/organizations/[id]/route";
import {
  listQuerySchema as teamsListQuerySchema,
  createSchema as teamCreateSchema,
} from "@/app/api/v1/organizations/[id]/teams/route";
import {
  listQuerySchema as membersListQuerySchema,
  createSchema as memberCreateSchema,
} from "@/app/api/v1/organizations/[id]/members/route";
import { patchSchema as memberPatchSchema } from "@/app/api/v1/organizations/[id]/members/[userId]/route";

const security = [{ bearerAuth: [] }, { apiKeyAuth: [] }];

const errorResponse = {
  description: "Error",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const orgIdParam = {
  name: "id",
  in: "path" as const,
  required: true,
  description: "Organization id",
  schema: { type: "string" },
};

const userIdParam = {
  name: "userId",
  in: "path" as const,
  required: true,
  description: "Member (user) id",
  schema: { type: "string" },
};

const organizationSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    slug: { type: "string" },
    plan: { type: "string", enum: ["starter", "growth", "enterprise"] },
    createdAt: { type: "string", format: "date-time" },
  },
};

const teamSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    orgId: { type: "string" },
    name: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
  },
};

const memberSchema = {
  type: "object",
  description: "A user record with passwordHash omitted.",
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

const roleDescriptorSchema = {
  type: "object",
  properties: {
    role: { type: "string", enum: ["owner", "admin", "manager", "member", "viewer"] },
    label: { type: "string" },
    description: { type: "string" },
    defaultScopes: { type: "array", items: { type: "string" } },
  },
};

export const organizationsPaths: OpenApiDocument["paths"] = {
  "/organizations/{id}": {
    get: {
      tags: ["Organizations"],
      summary: "Get an organization",
      security,
      parameters: [orgIdParam],
      responses: {
        "200": {
          description: "The organization",
          content: {
            "application/json": {
              schema: { type: "object", properties: { data: organizationSchema } },
            },
          },
        },
        default: errorResponse,
      },
    },
    patch: {
      tags: ["Organizations"],
      summary: "Update an organization",
      security,
      parameters: [orgIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: schemaRef("OrganizationPatchRequest", orgPatchSchema) },
        },
      },
      responses: {
        "200": {
          description: "The updated organization",
          content: {
            "application/json": {
              schema: { type: "object", properties: { data: organizationSchema } },
            },
          },
        },
        default: errorResponse,
      },
    },
  },
  "/organizations/{id}/teams": {
    get: {
      tags: ["Organizations"],
      summary: "List teams in an organization",
      security,
      parameters: [orgIdParam, ...paramsFromZodObject(teamsListQuerySchema, "query")],
      responses: {
        "200": {
          description: "Paginated list of teams",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { data: { type: "array", items: teamSchema } },
              },
            },
          },
        },
        default: errorResponse,
      },
    },
    post: {
      tags: ["Organizations"],
      summary: "Create a team",
      security,
      parameters: [orgIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: schemaRef("TeamCreateRequest", teamCreateSchema) },
        },
      },
      responses: {
        "201": {
          description: "The created team",
          content: {
            "application/json": { schema: { type: "object", properties: { data: teamSchema } } },
          },
        },
        default: errorResponse,
      },
    },
  },
  "/organizations/{id}/members": {
    get: {
      tags: ["Organizations"],
      summary: "List members of an organization",
      security,
      parameters: [orgIdParam, ...paramsFromZodObject(membersListQuerySchema, "query")],
      responses: {
        "200": {
          description: "Paginated list of members (passwordHash omitted)",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { data: { type: "array", items: memberSchema } },
              },
            },
          },
        },
        default: errorResponse,
      },
    },
    post: {
      tags: ["Organizations"],
      summary: "Invite a member to an organization",
      security,
      parameters: [orgIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: schemaRef("MemberCreateRequest", memberCreateSchema) },
        },
      },
      responses: {
        "201": {
          description: "The invited member",
          content: {
            "application/json": { schema: { type: "object", properties: { data: memberSchema } } },
          },
        },
        default: errorResponse,
      },
    },
  },
  "/organizations/{id}/members/{userId}": {
    patch: {
      tags: ["Organizations"],
      summary: "Update a member",
      security,
      parameters: [orgIdParam, userIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: schemaRef("MemberPatchRequest", memberPatchSchema) },
        },
      },
      responses: {
        "200": {
          description: "The updated member",
          content: {
            "application/json": { schema: { type: "object", properties: { data: memberSchema } } },
          },
        },
        default: errorResponse,
      },
    },
    delete: {
      tags: ["Organizations"],
      summary: "Remove a member from an organization",
      security,
      parameters: [orgIdParam, userIdParam],
      responses: {
        "200": {
          description: "Member removed",
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
  "/organizations/{id}/roles": {
    get: {
      tags: ["Organizations"],
      summary: "List role reference data (roles and their default scopes)",
      security,
      parameters: [orgIdParam],
      responses: {
        "200": {
          description: "Static list of the 5 platform roles",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { data: { type: "array", items: roleDescriptorSchema } },
              },
            },
          },
        },
        default: errorResponse,
      },
    },
  },
};

import type { OpenApiDocument } from "@/server/openapi/document";
import { paramsFromZodObject, schemaRef } from "@/server/openapi/schema-registry";
import {
  createSchema as reportCreateSchema,
  listQuerySchema as reportsListQuerySchema,
} from "@/app/api/v1/reports/route";

const security = [{ bearerAuth: [] }, { apiKeyAuth: [] }];

const errorResponse = {
  description: "Error",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const reportIdParam = {
  name: "id",
  in: "path" as const,
  required: true,
  description: "Report id",
  schema: { type: "string" },
};

const reportSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    orgId: { type: "string" },
    userId: { type: "string" },
    title: { type: "string" },
    format: { type: "string", enum: ["pdf", "csv"] },
    status: { type: "string", enum: ["queued", "generating", "ready", "failed"] },
    periodStart: { type: "string", format: "date-time" },
    periodEnd: { type: "string", format: "date-time" },
    createdAt: { type: "string", format: "date-time" },
    readyAt: { type: ["string", "null"], format: "date-time" },
    sizeBytes: { type: ["number", "null"] },
  },
};

export const reportsPaths: OpenApiDocument["paths"] = {
  "/reports": {
    get: {
      tags: ["Reports"],
      summary: "List reports for the caller's organization",
      security,
      parameters: paramsFromZodObject(reportsListQuerySchema, "query"),
      responses: {
        "200": {
          description: "Paginated list of reports, newest first",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { data: { type: "array", items: reportSchema } },
              },
            },
          },
        },
        default: errorResponse,
      },
    },
    post: {
      tags: ["Reports"],
      summary: "Create and synchronously generate a report",
      description:
        'There is no background job queue in this sandbox; generation (real CSV/PDF bytes) runs synchronously before the response is returned, so the report is already "ready" by the time this call completes.',
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: schemaRef("ReportCreateRequest", reportCreateSchema) },
        },
      },
      responses: {
        "201": {
          description: 'The generated report (status will be "ready")',
          content: {
            "application/json": { schema: { type: "object", properties: { data: reportSchema } } },
          },
        },
        default: errorResponse,
      },
    },
  },
  "/reports/{id}": {
    get: {
      tags: ["Reports"],
      summary: "Get report metadata",
      security,
      parameters: [reportIdParam],
      responses: {
        "200": {
          description: "The report",
          content: {
            "application/json": { schema: { type: "object", properties: { data: reportSchema } } },
          },
        },
        default: errorResponse,
      },
    },
  },
  "/reports/{id}/download": {
    get: {
      tags: ["Reports"],
      summary: "Download the generated report file",
      description:
        'Returns raw file bytes (application/pdf or text/csv), not a JSON envelope. 409s if the report isn\'t status "ready" yet.',
      security,
      parameters: [reportIdParam],
      responses: {
        "200": {
          description: "The report file",
          content: {
            "application/pdf": { schema: { type: "string", format: "binary" } },
            "text/csv": { schema: { type: "string" } },
          },
        },
        default: errorResponse,
      },
    },
  },
};

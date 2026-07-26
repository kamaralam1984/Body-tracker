import type { OpenApiDocument } from "@/server/openapi/document";
import { paramsFromZodObject } from "@/server/openapi/schema-registry";
import { querySchema as securityCenterQuerySchema } from "@/app/api/v1/security-center/overview/route";

const errorResponse = {
  description: "Error response",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const keySummarySchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    keyPrefix: { type: "string" },
  },
};

export const securityCenterPaths: OpenApiDocument["paths"] = {
  "/security-center/overview": {
    get: {
      tags: ["Security Center"],
      summary:
        "Real security posture for the caller's org — inactive, expired, near-expiration, compromised keys, and failed-auth spikes",
      description:
        "Every section here is a genuine query against real tables, not a mocked dashboard. `compromisedKeys` is honestly manual-flag-only (the `revokedReason` set on revoke) — this app has no external leaked-key-scanning service, so it never fabricates a 'detected' result. `failedAuthSpikes` is derived from real `ApiRequestLog` 401 rows in the last 24h, grouped by API key.",
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      parameters: paramsFromZodObject(securityCenterQuerySchema, "query"),
      responses: {
        "200": {
          description: "Real security posture data",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      inactiveDays: { type: "integer" },
                      nearExpirationDays: { type: "integer" },
                      inactiveKeys: {
                        type: "array",
                        items: {
                          allOf: [
                            keySummarySchema,
                            {
                              type: "object",
                              properties: {
                                lastUsedAt: { type: ["string", "null"], format: "date-time" },
                                createdAt: { type: "string", format: "date-time" },
                              },
                            },
                          ],
                        },
                      },
                      expiredKeys: {
                        type: "array",
                        items: {
                          allOf: [
                            keySummarySchema,
                            {
                              type: "object",
                              properties: { expiresAt: { type: "string", format: "date-time" } },
                            },
                          ],
                        },
                      },
                      nearExpirationKeys: {
                        type: "array",
                        items: {
                          allOf: [
                            keySummarySchema,
                            {
                              type: "object",
                              properties: { expiresAt: { type: "string", format: "date-time" } },
                            },
                          ],
                        },
                      },
                      compromisedKeys: { type: "array", items: keySummarySchema },
                      failedAuthSpikes: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            apiKeyId: { type: ["string", "null"] },
                            count: { type: "integer" },
                            distinctIps: { type: "integer" },
                            lastAttemptAt: { type: "string", format: "date-time" },
                          },
                        },
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

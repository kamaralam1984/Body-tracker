import type { OpenApiDocument } from "@/server/openapi/document";
import { paramsFromZodObject } from "@/server/openapi/schema-registry";
import { querySchema as summaryQuerySchema } from "@/app/api/v1/analytics/summary/route";
import { querySchema as dailyQuerySchema } from "@/app/api/v1/analytics/daily/route";
import { querySchema as insightsQuerySchema } from "@/app/api/v1/analytics/insights/route";

const security = [{ bearerAuth: [] }, { apiKeyAuth: [] }];

const errorResponse = {
  description: "Error",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const snapshotSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    orgId: { type: "string" },
    userId: { type: "string" },
    date: { type: "string", format: "date" },
    activeMinutes: { type: "number" },
    sessionsCompleted: { type: "number" },
    repsTotal: { type: "number" },
    avgFormScore: { type: "number" },
    focusScore: { type: "number" },
    postureScore: { type: "number" },
  },
};

const summarySchema = {
  type: "object",
  properties: {
    from: { type: "string", format: "date" },
    to: { type: "string", format: "date" },
    daysCovered: { type: "number" },
    activeMinutesTotal: { type: "number" },
    sessionsCompletedTotal: { type: "number" },
    repsTotalTotal: { type: "number" },
    avgFormScore: { type: "number" },
    avgFocusScore: { type: "number" },
    avgPostureScore: { type: "number" },
  },
};

const insightSchema = {
  type: "object",
  description:
    "A deterministic, rule-based comparison over real snapshot data (recent-vs-previous window averages, consecutive-day streaks). Not AI/ML-generated.",
  properties: {
    id: { type: "string" },
    tone: { type: "string", enum: ["positive", "neutral", "attention"] },
    title: { type: "string" },
    description: { type: "string" },
  },
};

export const analyticsPaths: OpenApiDocument["paths"] = {
  "/analytics/summary": {
    get: {
      tags: ["Analytics"],
      summary: "Aggregated totals and averages over a date range",
      security,
      parameters: paramsFromZodObject(summaryQuerySchema, "query", {
        from: "Start date (YYYY-MM-DD, inclusive). Defaults to 7 days ago.",
        to: "End date (YYYY-MM-DD, inclusive). Defaults to today.",
        userId: "Restrict to a single user id",
      }),
      responses: {
        "200": {
          description: "Totals and averages for the requested range",
          content: {
            "application/json": { schema: { type: "object", properties: { data: summarySchema } } },
          },
        },
        default: errorResponse,
      },
    },
  },
  "/analytics/daily": {
    get: {
      tags: ["Analytics"],
      summary: "List raw daily analytics snapshots",
      security,
      parameters: paramsFromZodObject(dailyQuerySchema, "query", {
        userId: "Restrict to a single user id",
        cursor: "Opaque pagination cursor",
        limit: "Page size (1-100, default 20)",
      }),
      responses: {
        "200": {
          description: "Paginated list of daily snapshots, sorted by date descending",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { data: { type: "array", items: snapshotSchema } },
              },
            },
          },
        },
        default: errorResponse,
      },
    },
  },
  "/analytics/insights": {
    get: {
      tags: ["Analytics"],
      summary: "Deterministic, rule-based insights derived from recent snapshot trends",
      security,
      parameters: paramsFromZodObject(insightsQuerySchema, "query", {
        userId: "Restrict to a single user id",
      }),
      responses: {
        "200": {
          description:
            "0-4 insight objects; fewer are returned when there isn't enough history for a comparison",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { data: { type: "array", items: insightSchema } },
              },
            },
          },
        },
        default: errorResponse,
      },
    },
  },
};

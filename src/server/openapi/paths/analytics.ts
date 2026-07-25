import type { OpenApiDocument } from "@/server/openapi/document";

const security = [{ bearerAuth: [] }, { apiKeyAuth: [] }];

const errorResponse = {
  description: "Error",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const fromParam = {
  name: "from",
  in: "query" as const,
  required: false,
  description: "Start date (YYYY-MM-DD, inclusive). Defaults to 7 days ago.",
  schema: { type: "string", format: "date" },
};

const toParam = {
  name: "to",
  in: "query" as const,
  required: false,
  description: "End date (YYYY-MM-DD, inclusive). Defaults to today.",
  schema: { type: "string", format: "date" },
};

const userIdQueryParam = {
  name: "userId",
  in: "query" as const,
  required: false,
  description: "Restrict to a single user id",
  schema: { type: "string" },
};

const cursorParam = {
  name: "cursor",
  in: "query" as const,
  required: false,
  description: "Opaque pagination cursor",
  schema: { type: "string" },
};

const limitParam = {
  name: "limit",
  in: "query" as const,
  required: false,
  description: "Page size (1-100, default 20)",
  schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
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
      parameters: [fromParam, toParam, userIdQueryParam],
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
      parameters: [userIdQueryParam, cursorParam, limitParam],
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
      parameters: [userIdQueryParam],
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

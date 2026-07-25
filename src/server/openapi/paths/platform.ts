import type { OpenApiDocument } from "../document";

export const platformPaths: OpenApiDocument["paths"] = {
  "/health": {
    get: {
      tags: ["Platform"],
      summary: "Liveness check",
      security: [],
      responses: {
        "200": {
          description: "The process is up",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  timestamp: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/status": {
    get: {
      tags: ["Platform"],
      summary: "Operational status, uptime, memory, and in-memory data store metrics",
      security: [],
      responses: {
        "200": {
          description: "OK",
          content: { "application/json": { schema: { type: "object" } } },
        },
      },
    },
  },
  "/openapi.json": {
    get: {
      tags: ["Platform"],
      summary: "This OpenAPI 3.1 document",
      security: [],
      responses: {
        "200": {
          description: "OK",
          content: { "application/json": { schema: { type: "object" } } },
        },
      },
    },
  },
};

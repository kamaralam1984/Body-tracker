export interface OpenApiDocument {
  openapi: "3.1.0";
  info: Record<string, unknown>;
  servers: Array<{ url: string; description: string }>;
  tags: Array<{ name: string; description: string }>;
  components: Record<string, unknown>;
  paths: Record<string, unknown>;
}

export const OPENAPI_BASE: Omit<OpenApiDocument, "paths"> = {
  openapi: "3.1.0",
  info: {
    title: "Body Tracker API",
    version: "1.0.0",
    description:
      "The Body Tracker API Platform — session management, live tracking, analytics, reports, and webhooks for computer-vision fitness and posture tracking.",
    contact: { name: "Body Tracker Developer Platform", url: "/docs" },
  },
  servers: [{ url: "/api/v1", description: "Current deployment" }],
  tags: [
    { name: "Auth", description: "Authentication and token lifecycle" },
    { name: "Users", description: "User accounts" },
    { name: "API Keys", description: "Personal and service API key management" },
    { name: "Organizations", description: "Organization, team, and membership management" },
    { name: "Sessions", description: "Tracking session records" },
    { name: "Tracking", description: "Live tracking control and realtime state" },
    { name: "Analytics", description: "Aggregated performance analytics" },
    { name: "Reports", description: "Generated report documents" },
    { name: "Webhooks", description: "Outbound event delivery" },
    {
      name: "OAuth",
      description: "This app acting as its own OAuth2 provider (authorization-code + PKCE)",
    },
    {
      name: "Service Accounts",
      description: "Machine identities for CI/CD and backend integrations",
    },
    {
      name: "Security Center",
      description:
        "Real security posture — inactive/expired/near-expiration/compromised keys, failed-auth spikes",
    },
    { name: "Notifications", description: "Real personal in-app notifications" },
    {
      name: "Platform Admin",
      description: "Real cross-org visibility for platform administrators only",
    },
    { name: "Platform", description: "Health, status, and platform metadata" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      apiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "Authorization",
        description: "`ApiKey <key>`",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: { type: ["object", "null"] },
            },
          },
          meta: { type: "object", properties: { traceId: { type: "string" } } },
        },
      },
    },
  },
};

export function mergePaths(...fragments: Array<Record<string, unknown>>): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const fragment of fragments) {
    for (const [path, value] of Object.entries(fragment)) {
      merged[path] = { ...(merged[path] as object | undefined), ...(value as object) };
    }
  }
  return merged;
}

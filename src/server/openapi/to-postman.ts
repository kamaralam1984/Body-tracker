/**
 * Converts the real OpenAPI 3.1 document (`buildOpenApiDocument()`) into a
 * Postman Collection v2.1 / Insomnia v4 export — a mechanical structural
 * mapping (paths → folders/requests, `security` → auth headers, `$ref`
 * request bodies → an empty JSON stub, since generating fake example field
 * values would be fabricated data this app doesn't do). Both exports are
 * derived from the same live document as `/api/v1/openapi.json`, so they
 * can't drift from the real API surface.
 */

interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  parameters?: Array<{ name: string; in: string; required?: boolean }>;
  requestBody?: unknown;
  security?: unknown[];
}

type OpenApiPathItem = Record<string, OpenApiOperation>;

interface OpenApiDoc {
  info: { title?: unknown; version?: unknown };
  servers?: Array<{ url: string }>;
  paths: Record<string, OpenApiPathItem>;
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];

function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean);
}

export function openApiToPostmanCollection(doc: OpenApiDoc): Record<string, unknown> {
  const folders = new Map<string, unknown[]>();

  for (const [path, item] of Object.entries(doc.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = item[method];
      if (!operation) continue;

      const tag = operation.tags?.[0] ?? "Other";
      if (!folders.has(tag)) folders.set(tag, []);

      const segments = splitPath(path);
      const query = (operation.parameters ?? [])
        .filter((p) => p.in === "query")
        .map((p) => ({ key: p.name, value: "", disabled: !p.required }));

      folders.get(tag)!.push({
        name: operation.summary ?? `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: [{ key: "Authorization", value: "Bearer {{accessToken}}", type: "text" }],
          url: {
            raw: `{{baseUrl}}/${segments.join("/")}${query.length ? "?" + query.map((q) => `${q.key}=`).join("&") : ""}`,
            host: ["{{baseUrl}}"],
            path: segments,
            query: query.length > 0 ? query : undefined,
          },
          ...(operation.requestBody
            ? { body: { mode: "raw", raw: "{}", options: { raw: { language: "json" } } } }
            : {}),
        },
      });
    }
  }

  return {
    info: {
      name: String(doc.info.title ?? "Body Tracker API"),
      description: `Version ${String(doc.info.version ?? "1.0.0")}. Generated from the live /api/v1/openapi.json document.`,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: [...folders.entries()].map(([tag, items]) => ({ name: tag, item: items })),
    variable: [
      { key: "baseUrl", value: doc.servers?.[0]?.url ?? "/api/v1" },
      { key: "accessToken", value: "" },
    ],
  };
}

/** Insomnia v4 export format — a flatter resource list rather than Postman's nested folder tree. */
export function openApiToInsomniaExport(doc: OpenApiDoc): Record<string, unknown> {
  const workspaceId = "wrk_body_tracker_api";
  const resources: Array<Record<string, unknown>> = [
    {
      _id: workspaceId,
      _type: "workspace",
      name: String(doc.info.title ?? "Body Tracker API"),
      scope: "collection",
    },
    {
      _id: "env_base",
      _type: "environment",
      parentId: workspaceId,
      name: "Base",
      data: { baseUrl: doc.servers?.[0]?.url ?? "/api/v1", accessToken: "" },
    },
  ];

  let counter = 0;
  for (const [path, item] of Object.entries(doc.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = item[method];
      if (!operation) continue;
      counter += 1;

      resources.push({
        _id: `req_${counter}`,
        _type: "request",
        parentId: workspaceId,
        name: operation.summary ?? `${method.toUpperCase()} ${path}`,
        method: method.toUpperCase(),
        url: `{{ _.baseUrl }}${path.replace(/{([^}]+)}/g, ":$1")}`,
        headers: [{ name: "Authorization", value: "Bearer {{ _.accessToken }}" }],
        ...(operation.requestBody ? { body: { mimeType: "application/json", text: "{}" } } : {}),
      });
    }
  }

  return { _type: "export", __export_format: 4, __export_source: "body-tracker-api", resources };
}

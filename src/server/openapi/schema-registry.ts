import { z } from "zod";

/**
 * Ties the OpenAPI document to the *real* Zod validators each route already
 * uses (`src/server/http/validate.ts`), instead of the hand-typed JSON
 * Schema objects `src/server/openapi/paths/*.ts` used to duplicate by hand.
 * A path fragment calls `schemaRef(name, theActualZodSchema)` and gets back
 * a `$ref` to drop into `requestBody`/`parameters`; `buildRegisteredSchemas()`
 * (called once per `/api/v1/openapi.json` request, after every path
 * fragment module has been imported and so has registered its schemas)
 * emits the real `components.schemas` entries via Zod's native
 * `z.toJSONSchema()` — no separate JSON Schema authored or maintained.
 */

const registry = new Map<string, z.ZodType>();

export function schemaRef(name: string, schema: z.ZodType): { $ref: string } {
  registry.set(name, schema);
  return { $ref: `#/components/schemas/${name}` };
}

/** Drops the per-schema `$schema` marker `z.toJSONSchema()` adds — only the
 * document root needs one; embedding it in every nested fragment is noise. */
function withoutSchemaKeyword(jsonSchema: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...jsonSchema };
  delete rest.$schema;
  return rest;
}

export function buildRegisteredSchemas(): Record<string, unknown> {
  const schemas: Record<string, unknown> = {};
  for (const [name, schema] of registry) {
    schemas[name] = withoutSchemaKeyword(
      z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>,
    );
  }
  return schemas;
}

type ParamLocation = "query" | "path";

/**
 * Derives an OpenAPI `parameters` array straight from a Zod object schema's
 * shape (one entry per field, `required` taken from the field's own
 * optionality) instead of a hand-typed duplicate of the same fields.
 */
export function paramsFromZodObject(
  schema: z.ZodObject<z.ZodRawShape>,
  location: ParamLocation,
  descriptions: Record<string, string> = {},
): Array<{
  name: string;
  in: ParamLocation;
  required: boolean;
  description?: string;
  schema: unknown;
}> {
  return Object.entries(schema.shape).map(([name, field]) => {
    const zodField = field as z.ZodType;
    return {
      name,
      in: location,
      required: location === "path" ? true : !zodField.isOptional(),
      ...(descriptions[name] ? { description: descriptions[name] } : {}),
      schema: withoutSchemaKeyword(
        z.toJSONSchema(zodField, { io: "input" }) as Record<string, unknown>,
      ),
    };
  });
}

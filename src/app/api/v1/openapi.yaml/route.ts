import { dump } from "js-yaml";
import { buildOpenApiDocument } from "@/app/api/v1/openapi.json/route";

export const dynamic = "force-dynamic";

/** Same document as `/api/v1/openapi.json`, serialized as YAML — a straight `js-yaml` dump of the identical object, so the two can never drift from each other. */
export async function GET() {
  const body = dump(buildOpenApiDocument(), { noRefs: true, lineWidth: -1 });
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/yaml; charset=utf-8",
      "Content-Disposition": 'inline; filename="openapi.yaml"',
    },
  });
}

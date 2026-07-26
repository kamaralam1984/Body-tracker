import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/app/api/v1/openapi.json/route";
import { openApiToPostmanCollection } from "@/server/openapi/to-postman";

export const dynamic = "force-dynamic";

/** Postman Collection v2.1 export, derived from the same live document as `/api/v1/openapi.json` — import directly into Postman. */
export async function GET() {
  const collection = openApiToPostmanCollection(
    buildOpenApiDocument() as Parameters<typeof openApiToPostmanCollection>[0],
  );
  return NextResponse.json(collection, {
    headers: {
      "Content-Disposition": 'inline; filename="body-tracker-api.postman_collection.json"',
    },
  });
}

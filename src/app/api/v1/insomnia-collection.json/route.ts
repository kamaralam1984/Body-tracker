import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/app/api/v1/openapi.json/route";
import { openApiToInsomniaExport } from "@/server/openapi/to-postman";

export const dynamic = "force-dynamic";

/** Insomnia v4 export, derived from the same live document as `/api/v1/openapi.json` — import directly into Insomnia. */
export async function GET() {
  const collection = openApiToInsomniaExport(
    buildOpenApiDocument() as Parameters<typeof openApiToInsomniaExport>[0],
  );
  return NextResponse.json(collection, {
    headers: {
      "Content-Disposition": 'inline; filename="body-tracker-api.insomnia_collection.json"',
    },
  });
}

import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/server/http/respond";
import { beginRequestContext } from "@/server/http/request-context";

export const dynamic = "force-dynamic";

// Unauthenticated on purpose: this is a convenience local test target so
// webhook deliveries (see /api/v1/webhooks/[id]/test) can be verified
// end-to-end without depending on any external network endpoint.
export async function POST(request: NextRequest) {
  try {
    beginRequestContext(request);
    const event = request.headers.get("x-btk-event");
    const signature = request.headers.get("x-btk-signature");

    let payload: unknown = null;
    const rawBody = await request.text();
    if (rawBody.length > 0) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = null;
      }
    }

    return ok({
      received: true,
      event: event ?? null,
      signaturePresent: Boolean(signature),
      payload,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

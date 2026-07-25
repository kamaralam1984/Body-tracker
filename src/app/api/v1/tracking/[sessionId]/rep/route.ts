import { NextRequest } from "next/server";
import { z } from "zod";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { conflict } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { getOrgSession, touchSession } from "@/server/services/sessions-service";
import {
  appendTrackingEvent,
  CALORIES_PER_REP,
  nextRunningAverage,
} from "@/server/services/tracking-service";

export const dynamic = "force-dynamic";

const repSchema = z.object({
  formScore: z.number().min(0).max(100).optional(),
});

const LOW_FORM_SCORE_THRESHOLD = 50;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "tracking:write");

    const body = await parseJsonBody(request, repSchema);
    const session = getOrgSession(principal.orgId, sessionId);
    if (session.status !== "active") {
      throw conflict(
        `Cannot record a rep for a session with status "${session.status}" — session must be active`,
      );
    }

    if (body.formScore !== undefined) {
      session.avgFormScore = nextRunningAverage(
        session.avgFormScore,
        session.repCount,
        body.formScore,
      );
    }
    session.repCount += 1;
    session.caloriesEstimate += CALORIES_PER_REP;
    touchSession(session);

    const repData: Record<string, number | string> = { repCount: session.repCount };
    if (body.formScore !== undefined) repData.formScore = body.formScore;
    appendTrackingEvent(session.id, "rep", `Rep ${session.repCount} recorded`, repData);

    if (body.formScore !== undefined && body.formScore < LOW_FORM_SCORE_THRESHOLD) {
      appendTrackingEvent(
        session.id,
        "form-alert",
        `Form score dropped to ${body.formScore} — check your form`,
        {
          formScore: body.formScore,
        },
      );
    }

    return ok(session, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

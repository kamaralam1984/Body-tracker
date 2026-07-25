import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { conflict } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { getOrgSession } from "@/server/services/sessions-service";
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
    const existing = await getOrgSession(principal.orgId, sessionId);
    if (existing.status !== "active") {
      throw conflict(
        `Cannot record a rep for a session with status "${existing.status}" — session must be active`,
      );
    }

    const avgFormScore =
      body.formScore !== undefined
        ? nextRunningAverage(existing.avgFormScore, existing.repCount, body.formScore)
        : existing.avgFormScore;

    const prisma = await getPrisma();
    const session = await prisma.trackingSession.update({
      where: { id: sessionId },
      data: {
        avgFormScore,
        repCount: existing.repCount + 1,
        caloriesEstimate: existing.caloriesEstimate + CALORIES_PER_REP,
      },
    });

    const repData: Record<string, number | string> = { repCount: session.repCount };
    if (body.formScore !== undefined) repData.formScore = body.formScore;
    await appendTrackingEvent(session.id, "rep", `Rep ${session.repCount} recorded`, repData);

    if (body.formScore !== undefined && body.formScore < LOW_FORM_SCORE_THRESHOLD) {
      await appendTrackingEvent(
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

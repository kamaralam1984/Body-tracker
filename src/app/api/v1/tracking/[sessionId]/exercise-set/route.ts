import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { conflict } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { getOrgSession } from "@/server/services/sessions-service";
import { CALORIES_PER_REP } from "@/server/services/tracking-service";

export const dynamic = "force-dynamic";

/**
 * Records one completed burst of repetitive motion, auto-detected
 * client-side from pose landmarks (see
 * `src/features/tracking/hooks/use-tracking-session-sync.ts`'s rep-cycle
 * detector) — which specific exercise it is isn't determinable without a
 * trained per-exercise classifier, so `exerciseName` defaults to the
 * generic "Movement set" rather than a fabricated specific label.
 */
const exerciseSetSchema = z.object({
  exerciseName: z.string().min(1).max(60).optional(),
  reps: z.number().int().min(1),
  durationSeconds: z.number().min(0),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "tracking:write");

    const body = await parseJsonBody(request, exerciseSetSchema);
    const existing = await getOrgSession(principal.orgId, sessionId);
    if (existing.status !== "active") {
      throw conflict(
        `Cannot record an exercise set for a session with status "${existing.status}" — session must be active`,
      );
    }

    const caloriesEstimate = Math.round(body.reps * CALORIES_PER_REP);

    const prisma = await getPrisma();
    const [exerciseSet] = await prisma.$transaction([
      prisma.exerciseSet.create({
        data: {
          orgId: principal.orgId,
          userId: principal.userId,
          sessionId,
          exerciseName: body.exerciseName ?? "Movement set",
          reps: body.reps,
          durationSeconds: Math.round(body.durationSeconds),
          caloriesEstimate,
        },
      }),
      prisma.trackingSession.update({
        where: { id: sessionId },
        data: {
          repCount: { increment: body.reps },
          caloriesEstimate: { increment: caloriesEstimate },
        },
      }),
    ]);

    return ok(exerciseSet, { status: 201, headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

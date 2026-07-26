import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { conflict } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { getOrgSession } from "@/server/services/sessions-service";
import { toPrismaEventType } from "@/server/services/tracking-service";
import { refreshTodayFocusPostureScores } from "@/server/services/analytics-snapshot-service";
import {
  computeAttentionScore,
  computePostureScore,
  computeFatigueScore,
  classifyMovementState,
} from "@/server/services/intelligence-metrics-service";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Ingests one ~10s window of tallied face-tracking aggregates from the
 * browser (see `src/features/tracking/hooks/use-tracking-session-sync.ts`) —
 * never raw landmarks, just counts/sums the client accumulated. Scores are
 * computed here, server-side, via `intelligence-metrics-service.ts`.
 */
export const metricsSchema = z.object({
  windowStart: z.iso.datetime(),
  windowEnd: z.iso.datetime(),
  frameCount: z.number().int().min(1),
  facePresentFrames: z.number().int().min(0),
  blinkCount: z.number().int().min(0),
  eyesClosedFrameCount: z.number().int().min(0),
  longEyeClosureCount: z.number().int().min(0),
  avgHeadYawDev: z.number(),
  avgHeadPitchDev: z.number(),
  avgHeadRollDev: z.number(),
  yawStdDev: z.number().min(0),
  pitchStdDev: z.number().min(0),
  rollStdDev: z.number().min(0),
  // Movement fields — only present when "pose" tracking mode is on for this
  // window (off by default, see DEFAULT_TRACKING_CONFIG).
  motionEnergy: z.number().min(0).optional(),
  lowerBodyVisible: z.boolean().optional(),
  gaitCadencePerMin: z.number().min(0).optional(),
  events: z
    .array(
      z.object({
        type: z.enum(["distraction", "drowsiness_alert", "gesture"]),
        message: z.string().min(1),
        durationSeconds: z.number().min(0).optional(),
        gestureType: z
          .enum(["wave", "raise-hand", "point", "thumbs-up", "pinch", "open-palm", "closed-hand"])
          .optional(),
      }),
    )
    .max(20)
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "tracking:write");

    const body = await parseJsonBody(request, metricsSchema);
    const existing = await getOrgSession(principal.orgId, sessionId);
    if (existing.status !== "active") {
      throw conflict(
        `Cannot record metrics for a session with status "${existing.status}" — session must be active`,
      );
    }

    const aggregate = {
      windowStart: new Date(body.windowStart),
      windowEnd: new Date(body.windowEnd),
      frameCount: body.frameCount,
      facePresentFrames: body.facePresentFrames,
      blinkCount: body.blinkCount,
      eyesClosedFrameCount: body.eyesClosedFrameCount,
      longEyeClosureCount: body.longEyeClosureCount,
      avgHeadYawDev: body.avgHeadYawDev,
      avgHeadPitchDev: body.avgHeadPitchDev,
      avgHeadRollDev: body.avgHeadRollDev,
      yawStdDev: body.yawStdDev,
      pitchStdDev: body.pitchStdDev,
      rollStdDev: body.rollStdDev,
    };

    const attentionScore = computeAttentionScore(aggregate);
    const postureScore = computePostureScore(aggregate);
    const fatigueScore = computeFatigueScore(aggregate);

    const hasMovementData = body.motionEnergy !== undefined && body.lowerBodyVisible !== undefined;
    const movementState = hasMovementData
      ? classifyMovementState({
          motionEnergy: body.motionEnergy!,
          lowerBodyVisible: body.lowerBodyVisible!,
          gaitCadencePerMin: body.gaitCadencePerMin ?? 0,
        })
      : undefined;

    const prisma = await getPrisma();
    const [sample] = await prisma.$transaction([
      prisma.trackingMetricSample.create({
        data: {
          orgId: principal.orgId,
          userId: principal.userId,
          sessionId,
          ...aggregate,
          attentionScore,
          postureScore,
          fatigueScore,
          motionEnergy: body.motionEnergy,
          lowerBodyVisible: body.lowerBodyVisible,
          gaitCadencePerMin: body.gaitCadencePerMin,
          movementState,
        },
      }),
      ...(body.events ?? []).map((event) =>
        prisma.trackingEvent.create({
          data: {
            sessionId,
            type: toPrismaEventType(event.type),
            message: event.message,
            data: {
              durationSeconds: event.durationSeconds ?? 0,
              ...(event.gestureType ? { gestureType: event.gestureType } : {}),
            } as Prisma.InputJsonValue,
          },
        }),
      ),
    ]);

    await refreshTodayFocusPostureScores(principal.orgId, principal.userId, aggregate.windowEnd);

    return ok(sample, { status: 201, headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

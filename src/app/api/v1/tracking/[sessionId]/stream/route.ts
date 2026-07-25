import { NextRequest } from "next/server";
import { getPrisma } from "@/server/db/prisma";
import { verifyAccessToken } from "@/server/auth/tokens";
import { errorResponse } from "@/server/http/respond";
import { notFound, unauthorized } from "@/server/http/errors";
import { toApiEventType } from "@/server/services/tracking-service";

export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 1000;
const HEARTBEAT_EVERY_TICKS = 15;

/**
 * Server-Sent-Events stream of a tracking session's live events.
 *
 * Browsers' native `EventSource` can't set an `Authorization` header, so — in
 * addition to `Authorization: Bearer <jwt>` for fetch/curl clients — this
 * endpoint accepts `?access_token=<jwt>` as a fallback. It deliberately does
 * NOT go through `resolvePrincipal` (header-only) and instead verifies the
 * token itself so the query-param fallback is possible here without loosening
 * auth anywhere else.
 *
 * Backed by the real Neon Postgres database via Prisma: every ~1s tick polls
 * `tracking_events` for rows newer than what's already been sent, and checks
 * the session's status to know when to close the stream. An in-flight guard
 * (`polling`) skips a tick if the previous poll's queries haven't finished
 * yet, so slow queries can't cause overlapping/racing polls.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const authHeader = request.headers.get("authorization") ?? "";
    const headerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null;
    const queryToken = request.nextUrl.searchParams.get("access_token");
    const token = headerToken ?? queryToken;
    if (!token)
      throw unauthorized(
        "Missing access token — use `Authorization: Bearer <token>` or `?access_token=`",
      );

    const payload = verifyAccessToken(token);
    if (!payload) throw unauthorized("Invalid or expired access token");

    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw unauthorized("Token subject not found");

    const session = await prisma.trackingSession.findUnique({ where: { id: sessionId } });
    if (!session || session.orgId !== user.orgId) throw notFound("Session");

    const encoder = new TextEncoder();
    let lastSeenCount = await prisma.trackingEvent.count({ where: { sessionId } });
    let tickCount = 0;
    let polling = false;

    const stream = new ReadableStream({
      start(controller) {
        async function pollOnce() {
          if (polling) return;
          polling = true;
          try {
            tickCount += 1;

            const events = await prisma.trackingEvent.findMany({
              where: { sessionId },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            });
            if (events.length > lastSeenCount) {
              for (const event of events.slice(lastSeenCount)) {
                const apiEvent = { ...event, type: toApiEventType(event.type) };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(apiEvent)}\n\n`));
              }
              lastSeenCount = events.length;
            }

            if (tickCount % HEARTBEAT_EVERY_TICKS === 0) {
              controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
            }

            const currentSession = await prisma.trackingSession.findUnique({
              where: { id: sessionId },
            });
            if (currentSession?.status === "completed") {
              controller.enqueue(encoder.encode(`event: closed\ndata: {}\n\n`));
              clearInterval(intervalId);
              try {
                controller.close();
              } catch {
                // Already closed — ignore.
              }
            }
          } finally {
            polling = false;
          }
        }

        const intervalId = setInterval(() => {
          pollOnce().catch((error) => {
            console.error("[tracking-stream] poll failed", error);
          });
        }, POLL_INTERVAL_MS);

        request.signal.addEventListener("abort", () => {
          clearInterval(intervalId);
          try {
            controller.close();
          } catch {
            // Already closed — ignore.
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

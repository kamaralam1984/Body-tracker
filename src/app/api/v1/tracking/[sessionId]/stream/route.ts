import { NextRequest } from "next/server";
import { getStore } from "@/server/db/store";
import { verifyAccessToken } from "@/server/auth/tokens";
import { errorResponse } from "@/server/http/respond";
import { notFound, unauthorized } from "@/server/http/errors";

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

    const store = getStore();
    const user = store.users.get(payload.sub);
    if (!user) throw unauthorized("Token subject not found");

    const session = store.trackingSessions.get(sessionId);
    if (!session || session.orgId !== user.orgId) throw notFound("Session");

    const encoder = new TextEncoder();
    let lastSeenCount = (store.trackingEvents.get(sessionId) ?? []).length;
    let tickCount = 0;

    const stream = new ReadableStream({
      start(controller) {
        const intervalId = setInterval(() => {
          tickCount += 1;

          const events = store.trackingEvents.get(sessionId) ?? [];
          if (events.length > lastSeenCount) {
            for (const event of events.slice(lastSeenCount)) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
            lastSeenCount = events.length;
          }

          if (tickCount % HEARTBEAT_EVERY_TICKS === 0) {
            controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
          }

          const currentSession = store.trackingSessions.get(sessionId);
          if (currentSession?.status === "completed") {
            controller.enqueue(encoder.encode(`event: closed\ndata: {}\n\n`));
            clearInterval(intervalId);
            try {
              controller.close();
            } catch {
              // Already closed — ignore.
            }
          }
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

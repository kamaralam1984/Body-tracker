import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody, parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { writeAudit } from "@/server/http/audit";
import { getOrGenerateReportContent } from "@/server/services/reports-service";
import type {
  Report as EntityReport,
  AnalyticsSnapshot as EntitySnapshot,
} from "@/server/db/entities";
import type {
  Report as PrismaReport,
  AnalyticsSnapshot as PrismaAnalyticsSnapshot,
} from "@prisma/client";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  status: z.enum(["queued", "generating", "ready", "failed"]).optional(),
  cursor: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const createSchema = z.object({
  title: z.string().min(1),
  format: z.enum(["pdf", "csv"]),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
});

/**
 * `reports-service.ts` predates this migration and intentionally still
 * speaks the old in-memory-store shapes (ISO date *strings*, see
 * `@/server/db/entities`) — it's out of scope for this migration (see
 * AGENTS.md), so rather than change its signature we adapt the
 * Prisma-shaped rows (real `Date` objects) into that shape at the call
 * site. This is a type-level shim only; the underlying values are the same.
 */
function toEntityReport(report: PrismaReport): EntityReport {
  return {
    ...report,
    periodStart: report.periodStart.toISOString(),
    periodEnd: report.periodEnd.toISOString(),
    createdAt: report.createdAt.toISOString(),
    readyAt: report.readyAt ? report.readyAt.toISOString() : null,
  };
}

function toEntitySnapshot(snapshot: PrismaAnalyticsSnapshot): EntitySnapshot {
  return { ...snapshot, date: snapshot.date.toISOString().slice(0, 10) };
}

/** Truncates a `Date` to a date-only value at midnight UTC, matching the `@db.Date` column semantics of `AnalyticsSnapshot.date`. */
function dateOnlyUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "reports:read");

    const query = parseQuery(request.nextUrl.searchParams, listQuerySchema);

    const prisma = await getPrisma();
    const rows = await prisma.report.findMany({
      where: { orgId: principal.orgId, ...(query.status ? { status: query.status } : {}) },
      orderBy: { createdAt: "desc" },
    });

    const page = paginate(rows, query.cursor, query.limit);

    return ok(page.items, {
      meta: { nextCursor: page.nextCursor, total: page.total },
      headers: rateLimitResponseHeaders(principal),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "reports:write");

    const body = await parseJsonBody(request, createSchema);

    const prisma = await getPrisma();
    let report = await prisma.report.create({
      data: {
        orgId: principal.orgId,
        userId: principal.userId,
        title: body.title,
        format: body.format,
        status: "queued",
        periodStart: new Date(body.periodStart),
        periodEnd: new Date(body.periodEnd),
      },
    });

    // There's no real background job queue (BullMQ+Redis) available in this
    // sandbox, so generation runs synchronously right here rather than being
    // enqueued and picked up by a worker. The content produced is real
    // (actual CSV/PDF bytes, not a stub), so this stands in honestly for
    // "async generation completed" without pretending to be async.
    report = await prisma.report.update({
      where: { id: report.id },
      data: { status: "generating" },
    });

    const periodStartDate = dateOnlyUTC(report.periodStart);
    const periodEndDate = dateOnlyUTC(report.periodEnd);
    const snapshots = await prisma.analyticsSnapshot.findMany({
      where: {
        orgId: principal.orgId,
        date: { gte: periodStartDate, lte: periodEndDate },
      },
      orderBy: { date: "asc" },
    });

    const buffer = getOrGenerateReportContent(
      toEntityReport(report),
      snapshots.map(toEntitySnapshot),
    );

    report = await prisma.report.update({
      where: { id: report.id },
      data: { status: "ready", readyAt: new Date(), sizeBytes: buffer.byteLength },
    });

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "report.created",
      target: report.id,
      metadata: { title: report.title, format: report.format, sizeBytes: report.sizeBytes },
    });

    return ok(report, { status: 201, headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore, newId, nowIso } from "@/server/db/store";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody, parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { writeAudit } from "@/server/http/audit";
import { getOrGenerateReportContent } from "@/server/services/reports-service";
import type { Report } from "@/server/db/entities";

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

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "reports:read");

    const query = parseQuery(request.nextUrl.searchParams, listQuerySchema);

    const store = getStore();
    const rows = [...store.reports.values()]
      .filter(
        (r) => r.orgId === principal.orgId && (query.status ? r.status === query.status : true),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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

    const store = getStore();
    const report: Report = {
      id: newId("rpt"),
      orgId: principal.orgId,
      userId: principal.userId,
      title: body.title,
      format: body.format,
      status: "queued",
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      createdAt: nowIso(),
      readyAt: null,
      sizeBytes: null,
    };
    store.reports.set(report.id, report);

    // There's no real background job queue (BullMQ+Redis) available in this
    // sandbox, so generation runs synchronously right here rather than being
    // enqueued and picked up by a worker. The content produced is real
    // (actual CSV/PDF bytes, not a stub), so this stands in honestly for
    // "async generation completed" without pretending to be async.
    report.status = "generating";

    const periodStartDate = report.periodStart.slice(0, 10);
    const periodEndDate = report.periodEnd.slice(0, 10);
    const snapshots = [...store.analyticsSnapshots.values()]
      .filter(
        (s) => s.orgId === principal.orgId && s.date >= periodStartDate && s.date <= periodEndDate,
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    const buffer = getOrGenerateReportContent(report, snapshots);

    report.status = "ready";
    report.readyAt = nowIso();
    report.sizeBytes = buffer.byteLength;

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

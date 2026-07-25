import { NextRequest } from "next/server";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope } from "@/server/http/principal";
import { errorResponse } from "@/server/http/respond";
import { notFound, conflict } from "@/server/http/errors";
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

const CONTENT_TYPES: Record<"pdf" | "csv", string> = {
  pdf: "application/pdf",
  csv: "text/csv",
};

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "reports:read");

    const prisma = await getPrisma();
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report || report.orgId !== principal.orgId) throw notFound("Report");
    if (report.status !== "ready") throw conflict("Report is not ready yet");

    // The in-memory content cache is process-local and can be empty after a
    // dev-server restart even though the report metadata says "ready" — in
    // that case we deterministically regenerate the same bytes from the
    // underlying snapshots rather than failing the download.
    const periodStartDate = dateOnlyUTC(report.periodStart);
    const periodEndDate = dateOnlyUTC(report.periodEnd);
    const snapshots = await prisma.analyticsSnapshot.findMany({
      where: {
        orgId: report.orgId,
        date: { gte: periodStartDate, lte: periodEndDate },
      },
      orderBy: { date: "asc" },
    });

    const buffer = getOrGenerateReportContent(
      toEntityReport(report),
      snapshots.map(toEntitySnapshot),
    );
    const extension = report.format === "pdf" ? "pdf" : "csv";
    const safeTitle = report.title.replace(/[^a-z0-9-_]+/gi, "_");

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[report.format],
        "Content-Disposition": `attachment; filename="${safeTitle}.${extension}"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

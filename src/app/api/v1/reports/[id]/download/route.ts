import { NextRequest } from "next/server";
import { getStore } from "@/server/db/store";
import { resolvePrincipal, requireScope } from "@/server/http/principal";
import { errorResponse } from "@/server/http/respond";
import { notFound, conflict } from "@/server/http/errors";
import { getOrGenerateReportContent } from "@/server/services/reports-service";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<"pdf" | "csv", string> = {
  pdf: "application/pdf",
  csv: "text/csv",
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "reports:read");

    const store = getStore();
    const report = store.reports.get(id);
    if (!report || report.orgId !== principal.orgId) throw notFound("Report");
    if (report.status !== "ready") throw conflict("Report is not ready yet");

    // The in-memory content cache is process-local and can be empty after a
    // dev-server restart even though the report metadata says "ready" — in
    // that case we deterministically regenerate the same bytes from the
    // underlying snapshots rather than failing the download.
    const periodStartDate = report.periodStart.slice(0, 10);
    const periodEndDate = report.periodEnd.slice(0, 10);
    const snapshots = [...store.analyticsSnapshots.values()]
      .filter(
        (s) => s.orgId === report.orgId && s.date >= periodStartDate && s.date <= periodEndDate,
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    const buffer = getOrGenerateReportContent(report, snapshots);
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

import type { KvlClient } from "../client";

/** File format a report is generated in. Mirrors `Report.format` (Prisma `ReportFormat`). */
export type ReportFormat = "pdf" | "csv";

/** Lifecycle status of a report. Mirrors `Report.status` (Prisma `ReportStatus`). */
export type ReportStatus = "queued" | "generating" | "ready" | "failed";

/**
 * A generated (or in-progress) report, as returned by `GET /reports`,
 * `GET /reports/{id}`, and `POST /reports`. Mirrors the `Report` Prisma
 * model with `Date` fields serialized as ISO strings over the wire.
 */
export interface Report {
  id: string;
  orgId: string;
  userId: string;
  title: string;
  format: ReportFormat;
  status: ReportStatus;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  readyAt: string | null;
  sizeBytes: number | null;
}

export interface ListReportsParams {
  status?: ReportStatus;
  cursor?: string;
  limit?: number;
}

export interface CreateReportInput {
  title: string;
  /** `"pdf" | "csv"` — see `createSchema` in `src/app/api/v1/reports/route.ts`. */
  format: ReportFormat;
  /** ISO date/datetime string marking the start of the reporting period. */
  periodStart: string;
  /** ISO date/datetime string marking the end of the reporting period. */
  periodEnd: string;
}

export class ReportsResource {
  constructor(private client: KvlClient) {}

  /** Lists reports for the caller's organization, newest first. Mirrors `GET /reports`. */
  /** The real route puts `nextCursor`/`total` in the response envelope's `meta`, not `data` — since `client.request()` only ever returns `body.data`, this honestly returns a plain array rather than a `PageResult` this SDK can't actually populate. */
  list(params: ListReportsParams = {}): Promise<Report[]> {
    return this.client.request({ method: "GET", path: "/reports", query: { ...params } });
  }

  /** Fetches a single report's metadata. Mirrors `GET /reports/{id}`. */
  get(id: string): Promise<Report> {
    return this.client.request({ method: "GET", path: `/reports/${id}` });
  }

  /**
   * Creates a report and synchronously generates its content — there's no
   * background job queue in this environment, so the returned report is
   * already `status: "ready"` by the time this resolves. Mirrors
   * `POST /reports`.
   */
  create(input: CreateReportInput): Promise<Report> {
    return this.client.request({ method: "POST", path: "/reports", body: input });
  }

  /**
   * Downloads the generated report file's raw bytes (`application/pdf` or
   * `text/csv`, not the usual JSON envelope). Rejects with a 409 if the
   * report isn't `status: "ready"` yet. Mirrors `GET /reports/{id}/download`.
   */
  download(id: string): Promise<Blob> {
    return this.client.request({ method: "GET", path: `/reports/${id}/download` });
  }
}

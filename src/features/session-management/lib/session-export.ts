/**
 * Client-side JSON export for a single session. The rest of the export
 * surface (CSV, Excel, PDF, print) is reused as-is from the existing
 * `@/features/reporting/lib/export-engine.ts` — this file adds only the one
 * format that engine doesn't cover.
 */

import { downloadFile } from "@/lib/download-file";
import type { SessionRecord } from "../types";

export function exportSessionAsJson(session: SessionRecord, filename: string): void {
  const json = JSON.stringify(session, null, 2);
  downloadFile(`${filename}.json`, new Blob([json], { type: "application/json;charset=utf-8" }));
}

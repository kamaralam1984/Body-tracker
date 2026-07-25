/**
 * Client-side JSON export for a single session. The rest of the export
 * surface (CSV, Excel, PDF, print) is reused as-is from the existing
 * `@/features/reporting/lib/export-engine.ts` — this file adds only the one
 * format that engine doesn't cover. `downloadBlob` mirrors that file's
 * private helper of the same name (not exported from there, so replicated
 * locally rather than reaching into its internals).
 */

import type { SessionRecord } from "../types";

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportSessionAsJson(session: SessionRecord, filename: string): void {
  const json = JSON.stringify(session, null, 2);
  downloadBlob(`${filename}.json`, new Blob([json], { type: "application/json;charset=utf-8" }));
}

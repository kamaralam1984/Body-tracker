/**
 * Small client-side JSON export helper for the Data & Privacy tab. Mirrors
 * the `downloadBlob` technique in `@/features/reporting/lib/export-engine.ts`
 * (no backend, no network calls — generated in the browser and downloaded
 * directly) but kept local to `settings` since it's JSON-specific and this
 * feature doesn't otherwise depend on `reporting`.
 */

export function downloadJsonExport(data: object, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

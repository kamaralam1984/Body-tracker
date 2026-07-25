/**
 * Shared blob-download helper — the same `URL.createObjectURL` + `<a
 * download>` + revoke pattern was duplicated across `export-engine.ts`,
 * `session-export.ts`, `privacy-export.ts`, and `chart-export.ts`. New
 * export/recording features should import this instead of re-implementing
 * it a 5th time.
 */
export function downloadFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, data: unknown): void {
  downloadFile(filename, new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
}

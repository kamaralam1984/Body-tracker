"use client";

/**
 * Read-only, browsable rendering of the real `/api/v1/openapi.json`
 * document via Redoc (real open-source package, not a custom renderer) —
 * a reference/browse view alongside `ApiExplorer`'s "Try it out" console.
 * Redoc bundles its own styles at runtime, so no separate CSS import.
 */

import { RedocStandalone } from "redoc";

export function RedocViewer() {
  return (
    <div className="border-border bg-surface overflow-hidden rounded-xl border">
      <RedocStandalone
        specUrl="/api/v1/openapi.json"
        options={{
          hideDownloadButton: true,
          expandResponses: "200,201",
          jsonSampleExpandLevel: 2,
          scrollYOffset: 64,
        }}
      />
    </div>
  );
}

import { defineConfig } from "tsup";

export default defineConfig([
  // Real ESM + CJS builds for npm consumers (bundlers, Node `require`/`import`).
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    splitting: false,
    minify: false,
    outDir: "dist",
  },
  // A real, standalone browser bundle for a plain `<script src="...">` tag
  // — no bundler, no npm install. Everything this SDK needs (fetch, URL,
  // FormData, XMLHttpRequest, AbortController) is a real browser global,
  // so this can safely bundle the whole SDK with zero externals.
  {
    entry: { "kvl-sdk": "src/index.ts" },
    format: ["iife"],
    globalName: "KvlSDK",
    dts: false,
    sourcemap: true,
    clean: false,
    minify: true,
    outDir: "dist/cdn",
  },
]);

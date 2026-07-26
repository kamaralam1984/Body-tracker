import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Real tsup build output for the @kvl/sdk and @kvl/react monorepo
    // packages (ESM/CJS/CDN bundles + .d.ts) — generated, not hand-written,
    // and the CDN bundle is deliberately minified (not meant to satisfy
    // this app's own source-formatting rules).
    "packages/*/dist/**",
    // Auto-generated from the live OpenAPI schema (openapi-typescript) —
    // see packages/sdk/scripts/generate-sdk-openapi-schema.mjs.
    "packages/sdk/src/generated/**",
    // vitest --coverage HTML report output.
    "packages/*/coverage/**",
  ]),
]);

export default eslintConfig;

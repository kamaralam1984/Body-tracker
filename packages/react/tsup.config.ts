import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  outDir: "dist",
  // Real peer/regular deps stay external — a consumer's own React and
  // @kvl/sdk installs are used, not a bundled second copy of either
  // (bundling React twice is a real, common source of "invalid hook
  // call" bugs this deliberately avoids).
  external: ["react", "react-dom", "@kvl/sdk", "@tanstack/react-query"],
});

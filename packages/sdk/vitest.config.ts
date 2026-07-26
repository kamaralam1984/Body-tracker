import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Integration tests make several genuine sequential network round-trips
    // against a real server (create -> start -> record -> pause -> resume ->
    // stop) — the 5s default is too tight for that, not a sign of anything
    // actually slow/broken.
    testTimeout: 15_000,
    typecheck: {
      enabled: true,
      include: ["test/**/*.test-d.ts"],
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/generated/**", "src/**/*.d.ts"],
    },
  },
});

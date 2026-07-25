#!/usr/bin/env node
/**
 * A real, dependency-free concurrent load tester — no k6/autocannon
 * (both would be new npm dependencies this project avoids). Plain Node
 * `fetch` fired with bounded concurrency, measuring genuine wall-clock
 * latency against the live API. Not a synthetic estimate — the numbers
 * this prints are real for whatever host it's run against.
 *
 * Usage:
 *   node scripts/load-test.mjs [--concurrency=20] [--requests=500] [--base=http://localhost:3045/api/v1]
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);

const BASE = args.base ?? process.env.BTK_API_BASE_URL ?? "http://localhost:3045/api/v1";
const CONCURRENCY = Number(args.concurrency ?? 20);
const TOTAL_REQUESTS = Number(args.requests ?? 500);

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "member@apex-performance.dev", password: "MemberPass123!" }),
  });
  const json = await res.json();
  return json.data.accessToken;
}

function buildScenario(token) {
  const auth = { Authorization: `Bearer ${token}` };
  return [
    { name: "GET /health", fn: () => fetch(`${BASE}/health`) },
    { name: "GET /status", fn: () => fetch(`${BASE}/status`) },
    { name: "GET /sessions", fn: () => fetch(`${BASE}/sessions`, { headers: auth }) },
    { name: "GET /users/me", fn: () => fetch(`${BASE}/users/me`, { headers: auth }) },
    { name: "GET /analytics/summary", fn: () => fetch(`${BASE}/analytics/summary`, { headers: auth }) },
  ];
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

async function worker(id, scenario, results, counter) {
  while (counter.remaining > 0) {
    counter.remaining -= 1;
    const step = scenario[Math.floor(Math.random() * scenario.length)];
    const start = performance.now();
    try {
      const res = await step.fn();
      await res.arrayBuffer();
      const durationMs = performance.now() - start;
      results.push({ name: step.name, durationMs, status: res.status, ok: res.ok });
    } catch (error) {
      results.push({ name: step.name, durationMs: performance.now() - start, status: 0, ok: false, error: String(error) });
    }
  }
}

async function main() {
  console.log(`Body Tracker load test — target: ${BASE}`);
  console.log(`concurrency=${CONCURRENCY} requests=${TOTAL_REQUESTS}\n`);

  const token = await login();
  const scenario = buildScenario(token);

  const results = [];
  const counter = { remaining: TOTAL_REQUESTS };
  const wallStart = performance.now();

  await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) => worker(i, scenario, results, counter)),
  );

  const wallMs = performance.now() - wallStart;
  const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const errors = results.filter((r) => !r.ok);

  console.log("Overall");
  console.log(`  requests:        ${results.length}`);
  console.log(`  wall time:       ${(wallMs / 1000).toFixed(2)}s`);
  console.log(`  throughput:      ${(results.length / (wallMs / 1000)).toFixed(1)} req/s`);
  console.log(`  errors:          ${errors.length} (${((errors.length / results.length) * 100).toFixed(1)}%)`);
  console.log(`  p50 latency:     ${percentile(durations, 50).toFixed(1)}ms`);
  console.log(`  p95 latency:     ${percentile(durations, 95).toFixed(1)}ms`);
  console.log(`  p99 latency:     ${percentile(durations, 99).toFixed(1)}ms`);
  console.log(`  max latency:     ${durations[durations.length - 1]?.toFixed(1) ?? 0}ms`);

  console.log("\nBy endpoint");
  for (const step of scenario) {
    const stepResults = results.filter((r) => r.name === step.name);
    const stepDurations = stepResults.map((r) => r.durationMs).sort((a, b) => a - b);
    const stepErrors = stepResults.filter((r) => !r.ok).length;
    console.log(
      `  ${step.name.padEnd(28)} n=${String(stepResults.length).padEnd(5)} p50=${percentile(stepDurations, 50).toFixed(0).padStart(5)}ms  p95=${percentile(stepDurations, 95).toFixed(0).padStart(5)}ms  errors=${stepErrors}`,
    );
  }

  console.log(
    "\nNote: these are real numbers from THIS run against THIS host, which may be a shared/contended " +
      "environment — re-run on the actual target host before treating figures as a capacity baseline. " +
      "See docs/ops/troubleshooting-guide.md.",
  );

  if (errors.length > 0) {
    console.log(`\nSample errors:`);
    for (const e of errors.slice(0, 5)) {
      console.log(`  ${e.name} -> status=${e.status} ${e.error ?? ""}`);
    }
  }
}

main().catch((error) => {
  console.error("Load test failed to run:", error);
  process.exitCode = 1;
});

#!/usr/bin/env node
/**
 * Real end-to-end integration tests for the Body Tracker API Platform.
 *
 * No test framework dependency is added (Jest/Vitest are not installed in
 * this project) — this is a plain Node script using `node:assert/strict`
 * against `fetch`, run with `node scripts/api-tests.mjs` against a live
 * server (see BTK_API_BASE_URL / defaults to http://localhost:3045).
 * Every request here hits real Route Handlers; nothing is mocked.
 */

import assert from "node:assert/strict";

const BASE = `${process.env.BTK_API_BASE_URL ?? "http://localhost:3045"}/api/v1`;

const SEED = {
  member: { email: "member@apex-performance.dev", password: "MemberPass123!" },
  owner: { email: "owner@apex-performance.dev", password: "OwnerPass123!" },
};

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok  - ${name}`);
  } catch (error) {
    failed += 1;
    failures.push({ name, error });
    console.log(`FAIL  - ${name}`);
    console.log(`        ${error.message}`);
  }
}

async function api(method, path, { token, apiKey, body, query } = {}) {
  const url = new URL(`${BASE}${path}`);
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined) url.searchParams.set(k, v);

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (apiKey) headers.Authorization = `ApiKey ${apiKey}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") ?? "";
  const json = contentType.includes("application/json") ? await res.json() : null;
  return { status: res.status, ok: res.ok, headers: res.headers, json, raw: json === null ? await res.clone().text() : null };
}

async function login(account) {
  const res = await api("POST", "/auth/login", { body: account });
  assert.equal(res.status, 200, `login should succeed: ${JSON.stringify(res.json)}`);
  return res.json.data;
}

async function main() {
  console.log(`\nBody Tracker API integration tests — target: ${BASE}\n`);

  // ---- Platform -----------------------------------------------------
  console.log("Platform");
  await test("GET /health returns ok", async () => {
    const res = await api("GET", "/health");
    assert.equal(res.status, 200);
    assert.equal(res.json.status, "ok");
  });

  await test("GET /status reports real process metrics", async () => {
    const res = await api("GET", "/status");
    assert.equal(res.status, 200);
    assert.equal(res.json.data.status, "operational");
    assert.ok(typeof res.json.data.uptimeSeconds === "number");
  });

  let openapiPathCount = 0;
  await test("GET /openapi.json exposes the full merged spec", async () => {
    const res = await api("GET", "/openapi.json");
    assert.equal(res.status, 200);
    assert.equal(res.json.openapi, "3.1.0");
    openapiPathCount = Object.keys(res.json.paths).length;
    assert.ok(openapiPathCount >= 30, `expected >=30 documented paths, got ${openapiPathCount}`);
  });

  // ---- Auth + Users ---------------------------------------------------
  console.log("\nAuth + Users");
  let memberTokens;
  await test("POST /auth/login succeeds with correct credentials", async () => {
    memberTokens = await login(SEED.member);
    assert.ok(memberTokens.accessToken);
    assert.ok(memberTokens.refreshToken);
  });

  await test("POST /auth/login rejects wrong password", async () => {
    const res = await api("POST", "/auth/login", { body: { email: SEED.member.email, password: "wrong" } });
    assert.equal(res.status, 401);
    assert.equal(res.json.error.code, "unauthorized");
  });

  await test("GET /users/me returns the caller's own profile", async () => {
    const res = await api("GET", "/users/me", { token: memberTokens.accessToken });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.email, SEED.member.email);
    assert.equal(res.json.data.passwordHash, undefined, "passwordHash must never be returned");
  });

  await test("PATCH /users/me updates the name", async () => {
    const res = await api("PATCH", "/users/me", { token: memberTokens.accessToken, body: { name: "Casey Nguyen (QA)" } });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.name, "Casey Nguyen (QA)");
  });

  await test("GET /users lists org members", async () => {
    const res = await api("GET", "/users", { token: memberTokens.accessToken });
    assert.equal(res.status, 200);
    assert.ok(res.json.data.items.length >= 3);
  });

  let rotatedTokens;
  await test("POST /auth/refresh rotates the refresh token and invalidates the old one", async () => {
    const res = await api("POST", "/auth/refresh", { body: { refreshToken: memberTokens.refreshToken } });
    assert.equal(res.status, 200);
    rotatedTokens = res.json.data;
    assert.notEqual(rotatedTokens.refreshToken, memberTokens.refreshToken);

    const reuse = await api("POST", "/auth/refresh", { body: { refreshToken: memberTokens.refreshToken } });
    assert.equal(reuse.status, 401, "a rotated-away refresh token must no longer work");
  });

  await test("GET /sessions rejects missing auth with 401", async () => {
    const res = await api("GET", "/sessions");
    assert.equal(res.status, 401);
  });

  // ---- API Keys ---------------------------------------------------
  console.log("\nAPI Keys");
  let apiKeyId, apiKeyPlaintext;
  await test("POST /api-keys creates a scoped key and returns the plaintext once", async () => {
    const res = await api("POST", "/api-keys", {
      token: rotatedTokens.accessToken,
      body: { name: "CI test key", scopes: ["sessions:read"] },
    });
    assert.equal(res.status, 201);
    assert.ok(res.json.data.apiKey.startsWith("btk_live_"));
    assert.equal(res.json.data.keyHash, undefined, "keyHash must never be returned");
    apiKeyId = res.json.data.id;
    apiKeyPlaintext = res.json.data.apiKey;
  });

  await test("The new API key can call an endpoint within its scope", async () => {
    const res = await api("GET", "/sessions", { apiKey: apiKeyPlaintext });
    assert.equal(res.status, 200);
  });

  await test("The new API key is rejected for an endpoint outside its scope", async () => {
    const res = await api("POST", "/sessions", {
      apiKey: apiKeyPlaintext,
      body: { title: "Should be forbidden", activityKind: "squat" },
    });
    assert.equal(res.status, 403);
    assert.equal(res.json.error.code, "forbidden");
  });

  await test("POST /api-keys/:id/rotate issues a new secret and invalidates the old one", async () => {
    const res = await api("POST", `/api-keys/${apiKeyId}/rotate`, { token: rotatedTokens.accessToken });
    assert.equal(res.status, 200);
    assert.notEqual(res.json.data.apiKey, apiKeyPlaintext);

    const oldKeyStillWorks = await api("GET", "/sessions", { apiKey: apiKeyPlaintext });
    assert.equal(oldKeyStillWorks.status, 401, "the old plaintext must stop working after rotation");
    apiKeyPlaintext = res.json.data.apiKey;
  });

  await test("DELETE /api-keys/:id revokes the key", async () => {
    const res = await api("DELETE", `/api-keys/${apiKeyId}`, { token: rotatedTokens.accessToken });
    assert.equal(res.status, 200);
    const revoked = await api("GET", "/sessions", { apiKey: apiKeyPlaintext });
    assert.equal(revoked.status, 401);
  });

  // ---- Organizations ---------------------------------------------------
  console.log("\nOrganizations");
  let ownerTokens, orgId;
  await test("Owner login + org lookup", async () => {
    ownerTokens = await login(SEED.owner);
    const res = await api("GET", "/users/me", { token: ownerTokens.accessToken });
    orgId = res.json.data.orgId;
    assert.ok(orgId);
  });

  await test("GET /organizations/:id returns the org", async () => {
    const res = await api("GET", `/organizations/${orgId}`, { token: ownerTokens.accessToken });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.id, orgId);
  });

  await test("GET /organizations/:id/roles lists the 5 platform roles", async () => {
    const res = await api("GET", `/organizations/${orgId}/roles`, { token: ownerTokens.accessToken });
    assert.equal(res.status, 200);
    const roles = Array.isArray(res.json.data) ? res.json.data : res.json.data.items;
    assert.equal(roles.length, 5);
  });

  let invitedUserId;
  await test("POST /organizations/:id/members invites a new member", async () => {
    const res = await api("POST", `/organizations/${orgId}/members`, {
      token: ownerTokens.accessToken,
      body: { email: `qa-${Date.now()}@apex-performance.dev`, name: "QA Invitee", role: "viewer" },
    });
    assert.equal(res.status, 201);
    invitedUserId = res.json.data.id;
  });

  await test("PATCH /organizations/:id/members/:userId changes the role", async () => {
    const res = await api("PATCH", `/organizations/${orgId}/members/${invitedUserId}`, {
      token: ownerTokens.accessToken,
      body: { role: "member" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.role, "member");
  });

  await test("DELETE /organizations/:id/members/:userId removes the invited member", async () => {
    const res = await api("DELETE", `/organizations/${orgId}/members/${invitedUserId}`, { token: ownerTokens.accessToken });
    assert.equal(res.status, 200);
  });

  await test("Cannot remove the organization owner", async () => {
    const meRes = await api("GET", "/users/me", { token: ownerTokens.accessToken });
    const res = await api("DELETE", `/organizations/${orgId}/members/${meRes.json.data.id}`, { token: ownerTokens.accessToken });
    assert.equal(res.status, 409);
  });

  // ---- Sessions + Tracking (+ SSE) ---------------------------------------------------
  console.log("\nSessions + Tracking");
  let sessionId;
  await test("POST /sessions creates an idle session", async () => {
    const res = await api("POST", "/sessions", {
      token: rotatedTokens.accessToken,
      body: { title: "CI verification session", activityKind: "squat" },
    });
    assert.equal(res.status, 201);
    assert.equal(res.json.data.status, "idle");
    sessionId = res.json.data.id;
  });

  await test("POST /tracking/:id/start transitions idle -> active", async () => {
    const res = await api("POST", `/tracking/${sessionId}/start`, { token: rotatedTokens.accessToken });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.status, "active");
  });

  await test("POST /tracking/:id/rep increments repCount", async () => {
    const res = await api("POST", `/tracking/${sessionId}/rep`, { token: rotatedTokens.accessToken, body: { formScore: 88 } });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.repCount, 1);
  });

  await test("pause -> resume round-trip", async () => {
    const paused = await api("POST", `/tracking/${sessionId}/pause`, { token: rotatedTokens.accessToken });
    assert.equal(paused.json.data.status, "paused");
    const resumed = await api("POST", `/tracking/${sessionId}/resume`, { token: rotatedTokens.accessToken });
    assert.equal(resumed.json.data.status, "active");
  });

  await test("GET /tracking/:id/status returns recent events", async () => {
    const res = await api("GET", `/tracking/${sessionId}/status`, { token: rotatedTokens.accessToken });
    assert.equal(res.status, 200);
    assert.ok(res.json.data.recentEvents.length >= 3);
  });

  await test("Real SSE stream delivers a live rep event", async () => {
    const abortController = new AbortController();
    const streamRes = await fetch(`${BASE}/tracking/${sessionId}/stream`, {
      headers: { Authorization: `Bearer ${rotatedTokens.accessToken}` },
      signal: abortController.signal,
    });
    assert.equal(streamRes.status, 200);
    assert.ok((streamRes.headers.get("content-type") ?? "").includes("text/event-stream"));

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let sawRepEvent = false;

    // Fire the rep shortly after the stream connects — do NOT overlap this
    // with reader.read() calls below (a ReadableStreamDefaultReader only
    // supports one in-flight read() at a time; racing read() against a
    // timer and looping caused spurious duplicate read() calls here before).
    const repPromise = new Promise((resolve) => setTimeout(resolve, 300)).then(() =>
      api("POST", `/tracking/${sessionId}/rep`, { token: rotatedTokens.accessToken, body: { formScore: 91 } }),
    );

    // Generous — on a heavily loaded shared host, timer-driven long-lived
    // connections (this poll-based SSE stream ticks every ~1s server-side)
    // can lag well behind wall-clock time under CPU contention from other
    // processes. This is a real operational characteristic, not a bug —
    // see docs/ops/troubleshooting-guide.md.
    const timeoutId = setTimeout(() => abortController.abort(), 25000);
    try {
      while (!sawRepEvent) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        if (buffer.includes('"type":"rep"')) sawRepEvent = true;
      }
    } catch {
      // Aborted by the timeout below — sawRepEvent reflects whatever we saw before that.
    } finally {
      clearTimeout(timeoutId);
    }
    await repPromise;
    assert.ok(sawRepEvent, "expected to observe a live 'rep' event over SSE");
  });

  await test("POST /tracking/:id/stop completes the session", async () => {
    const res = await api("POST", `/tracking/${sessionId}/stop`, { token: rotatedTokens.accessToken });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.status, "completed");
    assert.ok(res.json.data.repCount >= 2);
  });

  await test("PATCH then DELETE the session", async () => {
    const patched = await api("PATCH", `/sessions/${sessionId}`, { token: rotatedTokens.accessToken, body: { title: "Renamed" } });
    assert.equal(patched.status, 200);
    assert.equal(patched.json.data.title, "Renamed");

    const deleted = await api("DELETE", `/sessions/${sessionId}`, { token: rotatedTokens.accessToken });
    assert.equal(deleted.status, 200);

    const gone = await api("GET", `/sessions/${sessionId}`, { token: rotatedTokens.accessToken });
    assert.equal(gone.status, 404);
  });

  // ---- Analytics + Reports ---------------------------------------------------
  console.log("\nAnalytics + Reports");
  await test("GET /analytics/summary aggregates real snapshot data", async () => {
    const res = await api("GET", "/analytics/summary", { token: rotatedTokens.accessToken });
    assert.equal(res.status, 200);
    assert.ok(typeof res.json.data.activeMinutesTotal === "number");
  });

  await test("GET /analytics/insights returns rule-based insights", async () => {
    const res = await api("GET", "/analytics/insights", { token: rotatedTokens.accessToken });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json.data) || Array.isArray(res.json.data.items));
  });

  let csvReportId;
  await test("POST /reports (csv) generates real CSV content synchronously", async () => {
    const res = await api("POST", "/reports", {
      token: rotatedTokens.accessToken,
      body: { title: "CI CSV report", format: "csv", periodStart: "2026-07-01", periodEnd: "2026-07-24" },
    });
    assert.equal(res.status, 201);
    assert.equal(res.json.data.status, "ready");
    assert.ok(res.json.data.sizeBytes > 0);
    csvReportId = res.json.data.id;
  });

  await test("GET /reports/:id/download returns a real CSV file", async () => {
    const res = await fetch(`${BASE}/reports/${csvReportId}/download`, {
      headers: { Authorization: `Bearer ${rotatedTokens.accessToken}` },
    });
    assert.equal(res.status, 200);
    assert.ok((res.headers.get("content-type") ?? "").includes("csv"));
    const text = await res.text();
    assert.ok(text.startsWith("date,"), `expected a CSV header row, got: ${text.slice(0, 40)}`);
  });

  let pdfReportId;
  await test("POST /reports (pdf) generates a real PDF via jsPDF", async () => {
    const res = await api("POST", "/reports", {
      token: rotatedTokens.accessToken,
      body: { title: "CI PDF report", format: "pdf", periodStart: "2026-07-01", periodEnd: "2026-07-24" },
    });
    assert.equal(res.status, 201);
    pdfReportId = res.json.data.id;
  });

  await test("GET /reports/:id/download returns a real PDF file", async () => {
    const res = await fetch(`${BASE}/reports/${pdfReportId}/download`, {
      headers: { Authorization: `Bearer ${rotatedTokens.accessToken}` },
    });
    assert.equal(res.status, 200);
    assert.ok((res.headers.get("content-type") ?? "").includes("pdf"));
    const buf = new Uint8Array(await res.arrayBuffer());
    const header = Buffer.from(buf.slice(0, 5)).toString("utf8");
    assert.equal(header, "%PDF-");
  });

  // ---- Webhooks ---------------------------------------------------
  console.log("\nWebhooks");
  await test("POST /webhooks/echo is publicly reachable", async () => {
    const res = await api("POST", "/webhooks/echo", { body: { hello: "world" } });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.received, true);
  });

  let webhookId;
  await test("POST /webhooks registers a webhook targeting the local echo endpoint", async () => {
    const res = await api("POST", "/webhooks", {
      token: rotatedTokens.accessToken,
      body: { url: `${BASE}/webhooks/echo`, events: ["session.started"] },
    });
    assert.equal(res.status, 201);
    assert.ok(res.json.data.secret, "secret should be returned once on creation");
    webhookId = res.json.data.id;
  });

  await test("GET /webhooks never leaks the secret", async () => {
    const res = await api("GET", "/webhooks", { token: rotatedTokens.accessToken });
    assert.equal(res.status, 200);
    const items = Array.isArray(res.json.data) ? res.json.data : res.json.data.items;
    const mine = items.find((w) => w.id === webhookId);
    assert.ok(mine);
    assert.equal(mine.secret, undefined);
  });

  await test("POST /webhooks/:id/test performs a real signed HTTP delivery", async () => {
    const res = await api("POST", `/webhooks/${webhookId}/test`, { token: rotatedTokens.accessToken, body: {} });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.status, "success", `delivery should succeed against the local echo target: ${JSON.stringify(res.json.data)}`);
    assert.equal(res.json.data.responseStatus, 200);
  });

  await test("GET /webhooks/:id/deliveries records the delivery", async () => {
    const res = await api("GET", `/webhooks/${webhookId}/deliveries`, { token: rotatedTokens.accessToken });
    assert.equal(res.status, 200);
    const items = Array.isArray(res.json.data) ? res.json.data : res.json.data.items;
    assert.ok(items.length >= 1);
  });

  await test("DELETE /webhooks/:id removes it", async () => {
    const res = await api("DELETE", `/webhooks/${webhookId}`, { token: rotatedTokens.accessToken });
    assert.equal(res.status, 200);
  });

  // ---- Rate limiting ---------------------------------------------------
  console.log("\nRate limiting");
  await test("Successful responses carry rate-limit headers", async () => {
    const res = await api("GET", "/users/me", { token: rotatedTokens.accessToken });
    assert.ok(res.headers.get("x-ratelimit-limit"));
    assert.ok(res.headers.get("x-ratelimit-remaining"));
  });

  // ---- Summary ---------------------------------------------------
  console.log(`\n${passed} passed, ${failed} failed (out of ${passed + failed}, ${openapiPathCount} documented endpoints)\n`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Fatal error running the test suite:", error);
  process.exitCode = 1;
});

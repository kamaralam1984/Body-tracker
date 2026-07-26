import { describe, it, expect, beforeAll } from "vitest";
import { KvlClient } from "../../src/index";
import { BASE_URL, TEST_OWNER, isServerReachable } from "./setup";

describe.runIf(await isServerReachable())("integration: real resource clients", () => {
  let client: KvlClient;

  beforeAll(async () => {
    client = new KvlClient({ baseUrl: BASE_URL, auth: { type: "none" } });
    await client.login(TEST_OWNER.email, TEST_OWNER.password);
  });

  it("sessions: create -> get -> update round-trip against the real database", async () => {
    const created = await client.sessions.create({
      title: "vitest integration session",
      activityKind: "squat",
    });
    expect(created.status).toBe("idle");

    const fetched = await client.sessions.get(created.id);
    expect(fetched.title).toBe("vitest integration session");

    const updated = await client.sessions.update(created.id, { title: "renamed by vitest" });
    expect(updated.title).toBe("renamed by vitest");
  });

  it("tracking: real start -> rep -> pause -> resume -> stop lifecycle", async () => {
    const session = await client.sessions.create({
      title: "vitest tracking lifecycle",
      activityKind: "squat",
    });

    const started = await client.tracking.start(session.id);
    expect(started.status).toBe("active");

    const withRep = await client.tracking.recordRep(session.id, { formScore: 90 });
    expect(withRep.repCount).toBeGreaterThanOrEqual(1);

    const paused = await client.tracking.pause(session.id);
    expect(paused.status).toBe("paused");

    const resumed = await client.tracking.resume(session.id);
    expect(resumed.status).toBe("active");

    const stopped = await client.tracking.stop(session.id);
    expect(stopped.status).toBe("completed");
  });

  it("apiKeys: real create -> patch scopes -> rotate -> revoke lifecycle, with a real one-time secret", async () => {
    const created = await client.apiKeys.create({
      name: "vitest integration key",
      scopes: ["sessions:read"],
    });
    expect(created.apiKey).toMatch(/^sk_live_/);

    const patched = await client.apiKeys.update(created.id, {
      scopes: ["sessions:read", "analytics:read"],
    });
    expect(patched.scopes).toContain("analytics:read");

    const rotated = await client.apiKeys.rotate(created.id, 0.01);
    expect(rotated.oldKeyId).toBe(created.id);
    expect(rotated.apiKey).not.toBe(created.apiKey);

    const history = await client.apiKeys.rotationHistory(rotated.id);
    expect(history.length).toBeGreaterThanOrEqual(1);

    const revoked = await client.apiKeys.revoke(rotated.id, "Testing Complete");
    expect(revoked.success).toBe(true);
  });

  it("securityCenter.overview() returns the real shape (not a mocked dashboard)", async () => {
    const overview = await client.securityCenter.overview();
    expect(overview).toHaveProperty("inactiveKeys");
    expect(overview).toHaveProperty("compromisedKeys");
    expect(overview).toHaveProperty("failedAuthSpikes");
    expect(Array.isArray(overview.compromisedKeys)).toBe(true);
  });

  it("platformAdmin routes reject a non-platform-admin session with a real 403", async () => {
    await expect(client.platformAdmin.organizations()).rejects.toMatchObject({
      code: "platform_admin_required",
    });
  });
});

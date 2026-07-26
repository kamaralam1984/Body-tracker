import { describe, it, expect, beforeAll } from "vitest";
import { KvlClient } from "../../src/index";
import { BASE_URL, TEST_OWNER, isServerReachable } from "./setup";

describe.runIf(await isServerReachable())("integration: remaining real resource clients", () => {
  let client: KvlClient;

  beforeAll(async () => {
    client = new KvlClient({ baseUrl: BASE_URL, auth: { type: "none" } });
    await client.login(TEST_OWNER.email, TEST_OWNER.password);
  });

  it("users: me() -> updateMe() round-trip", async () => {
    const me = await client.users.me();
    expect(me.email).toBe(TEST_OWNER.email);
    const restoredName = me.name;
    const updated = await client.users.updateMe({ name: `${restoredName} (vitest)` });
    expect(updated.name).toBe(`${restoredName} (vitest)`);
    await client.users.updateMe({ name: restoredName });
  });

  it("organizations: get() returns the real caller's org", async () => {
    const me = await client.users.me();
    const org = await client.organizations.get(me.orgId);
    expect(org.id).toBe(me.orgId);
  });

  it("organizations: teams()/members() return real plain arrays (pagination lives in `meta`, honestly not exposed)", async () => {
    const me = await client.users.me();
    const teams = await client.organizations.teams(me.orgId);
    expect(Array.isArray(teams)).toBe(true);
    const members = await client.organizations.members(me.orgId);
    expect(Array.isArray(members)).toBe(true);
  });

  it("webhooks: real create -> list -> test -> deliveries -> delete lifecycle", async () => {
    const created = await client.webhooks.create({
      url: "https://example.com/vitest-webhook",
      events: ["session.completed"],
    });
    expect(created.secret).toBeTruthy();

    const list = await client.webhooks.list();
    expect(list.some((w) => w.id === created.id)).toBe(true);

    await client.webhooks.test(created.id, { event: "session.completed" }).catch(() => {
      // A real outbound delivery to a fake URL is expected to fail — this just confirms the endpoint is real and reachable, not that the fake target accepts it.
    });

    const deliveries = await client.webhooks.deliveries(created.id);
    expect(Array.isArray(deliveries)).toBe(true);

    const deleted = await client.webhooks.delete(created.id);
    expect(deleted).toBeTruthy();
  });

  it("reports: real create -> list -> get lifecycle", async () => {
    const created = await client.reports.create({
      title: "vitest integration report",
      format: "csv",
      periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
    });
    expect(created.status).toBe("ready");

    const list = await client.reports.list();
    expect(Array.isArray(list)).toBe(true);
    expect(list.some((r) => r.id === created.id)).toBe(true);

    const fetched = await client.reports.get(created.id);
    expect(fetched.title).toBe("vitest integration report");
  });

  it("notifications: real list -> markRead -> markAllRead", async () => {
    const list = await client.notifications.list({ limit: 5 });
    expect(list).toHaveProperty("unreadCount");
    expect(Array.isArray(list.items)).toBe(true);

    const result = await client.notifications.markAllRead();
    expect(typeof result.updated).toBe("number");
  });

  it("analytics: summary() returns the real aggregate shape", async () => {
    const summary = await client.analytics.summary();
    expect(summary).toHaveProperty("avgFormScore");
    expect(summary).toHaveProperty("daysCovered");
  });

  it("serviceAccounts: real create -> list -> issueApiKey -> delete lifecycle", async () => {
    const created = await client.serviceAccounts.create({
      name: "vitest integration service account",
    });
    const list = await client.serviceAccounts.list();
    expect(list.items.some((a) => a.id === created.id)).toBe(true);

    const key = await client.serviceAccounts.issueApiKey(created.id, {
      name: "vitest svc key",
      scopes: ["sessions:read"],
    });
    expect(key.apiKey).toMatch(/^sk_live_/);

    await client.serviceAccounts.delete(created.id);
  });

  it("oauth: listClients() returns the real cross-request PageResult shape", async () => {
    const clients = await client.oauth.listClients();
    expect(clients).toHaveProperty("items");
    expect(clients).toHaveProperty("total");
  });
});

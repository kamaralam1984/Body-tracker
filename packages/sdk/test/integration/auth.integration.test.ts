import { describe, it, expect } from "vitest";
import { KvlClient, isKvlApiError } from "../../src/index";
import { BASE_URL, TEST_OWNER, isServerReachable } from "./setup";

describe.runIf(await isServerReachable())("integration: real login/logout/refresh", () => {
  it("client.login() establishes a real session against the real server", async () => {
    const client = new KvlClient({ baseUrl: BASE_URL, auth: { type: "none" } });
    const result = await client.login(TEST_OWNER.email, TEST_OWNER.password);
    expect(result.user.email).toBe(TEST_OWNER.email);
    expect(result.accessToken).toBeTruthy();

    const me = await client.users.me();
    expect(me.email).toBe(TEST_OWNER.email);
  });

  it("wrong credentials produce a real 401 KvlApiError", async () => {
    const client = new KvlClient({ baseUrl: BASE_URL, auth: { type: "none" } });
    try {
      await client.login(TEST_OWNER.email, "definitely-wrong-password");
      expect.fail("expected login() to throw");
    } catch (error) {
      expect(isKvlApiError(error)).toBe(true);
      if (isKvlApiError(error)) expect(error.status).toBe(401);
    }
  });

  it("an expired/garbage access token is auto-refreshed and the request transparently recovers", async () => {
    const bootstrap = new KvlClient({ baseUrl: BASE_URL, auth: { type: "none" } });
    const { refreshToken } = await bootstrap.login(TEST_OWNER.email, TEST_OWNER.password);

    const client = new KvlClient({
      baseUrl: BASE_URL,
      auth: { type: "bearer", accessToken: "garbage.invalid.token", refreshToken },
    });
    const me = await client.users.me();
    expect(me.email).toBe(TEST_OWNER.email);
  });

  it("client.logout() really revokes the session server-side", async () => {
    const client = new KvlClient({ baseUrl: BASE_URL, auth: { type: "none" } });
    await client.login(TEST_OWNER.email, TEST_OWNER.password);
    await client.logout();

    try {
      await client.users.me();
      expect.fail("expected a 401 after logout");
    } catch (error) {
      expect(isKvlApiError(error)).toBe(true);
    }
  });
});

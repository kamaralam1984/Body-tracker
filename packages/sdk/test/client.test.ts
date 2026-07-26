import { describe, it, expect, vi } from "vitest";
import { KvlClient } from "../src/client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("KvlClient — request plumbing (mocked fetch, no real network)", () => {
  it("attaches the real API-key auth header on every request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { ok: true } }));
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "apiKey", apiKey: "sk_live_test123" },
      fetch: fetchMock,
    });

    await client.request({ method: "GET", path: "/sessions" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("ApiKey sk_live_test123");
  });

  it("attaches the real Bearer auth header from a pre-supplied session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { ok: true } }));
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "bearer", accessToken: "tok123", refreshToken: "ref123" },
      fetch: fetchMock,
    });

    await client.request({ method: "GET", path: "/users/me" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer tok123");
  });

  it("unwraps the real {data} envelope — request() resolves to the payload, not the envelope", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { id: "sess_1", title: "Squats" } }));
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "apiKey", apiKey: "k" },
      fetch: fetchMock,
    });

    const result = await client.request<{ id: string; title: string }>({
      method: "GET",
      path: "/sessions/sess_1",
    });
    expect(result).toEqual({ id: "sess_1", title: "Squats" });
  });

  it("throws a real KvlApiError with the server's real code/status/message on a non-2xx", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: { code: "insufficient_scope", message: "nope" } }, 403),
      );
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "apiKey", apiKey: "k" },
      fetch: fetchMock,
    });

    await expect(client.request({ method: "GET", path: "/api-keys" })).rejects.toMatchObject({
      code: "insufficient_scope",
      status: 403,
      message: "nope",
    });
  });

  it("serializes a JSON body and sets Content-Type automatically", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { ok: true } }));
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "apiKey", apiKey: "k" },
      fetch: fetchMock,
    });

    await client.request({
      method: "POST",
      path: "/sessions",
      body: { title: "Squats", activityKind: "squat" },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ title: "Squats", activityKind: "squat" }));
  });

  it("emits real request.start/request.success lifecycle events", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { ok: true } }));
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "apiKey", apiKey: "k" },
      fetch: fetchMock,
    });

    const events: string[] = [];
    client.on("request.start", () => events.push("start"));
    client.on("request.success", () => events.push("success"));

    await client.request({ method: "GET", path: "/sessions" });
    expect(events).toEqual(["start", "success"]);
  });

  it("runs registered middleware's beforeRequest/afterResponse hooks", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { ok: true } }));
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "apiKey", apiKey: "k" },
      fetch: fetchMock,
    });

    const before = vi.fn((ctx) => ctx);
    const after = vi.fn();
    client.use({ beforeRequest: before, afterResponse: after });

    await client.request({ method: "GET", path: "/sessions" });
    expect(before).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("throws a clear, friendly error if constructed without baseUrl outside a browser", () => {
    expect(() => new KvlClient({ auth: { type: "apiKey", apiKey: "k" } })).toThrow(
      /baseUrl.*required/i,
    );
  });
});

describe("KvlClient — auto-refresh-and-retry on 401 (mocked fetch)", () => {
  it("refreshes once on a 401 then retries the original request with the new token", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(new Response(null, { status: 401 })))
      .mockImplementationOnce(() =>
        Promise.resolve(
          jsonResponse({
            data: { accessToken: "new-tok", refreshToken: "new-ref", expiresIn: 900 },
          }),
        ),
      )
      .mockImplementationOnce(() => Promise.resolve(jsonResponse({ data: { email: "a@b.com" } })));

    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "bearer", accessToken: "stale-tok", refreshToken: "ref123" },
      fetch: fetchMock,
    });

    const result = await client.request<{ email: string }>({ method: "GET", path: "/users/me" });
    expect(result).toEqual({ email: "a@b.com" });
    expect(fetchMock).toHaveBeenCalledTimes(3); // original (401) -> refresh -> retried original

    const thirdCallHeaders = (fetchMock.mock.calls[2][1] as RequestInit).headers as Headers;
    expect(thirdCallHeaders.get("Authorization")).toBe("Bearer new-tok");
  });
});

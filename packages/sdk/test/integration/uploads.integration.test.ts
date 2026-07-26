import { describe, it, expect, beforeAll } from "vitest";
import { KvlClient } from "../../src/index";
import { BASE_URL, TEST_OWNER, isServerReachable } from "./setup";

// A real, minimal 1x1 PNG (not a fabricated/empty file) — same bytes a
// real image editor would produce for a 1x1 red pixel.
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVQI12P4z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

describe.runIf(await isServerReachable())("integration: real avatar upload", () => {
  let client: KvlClient;

  beforeAll(async () => {
    client = new KvlClient({ baseUrl: BASE_URL, auth: { type: "none" } });
    await client.login(TEST_OWNER.email, TEST_OWNER.password);
  });

  it("uploads a real image, serves it back byte-identical, then removes it", async () => {
    const bytes = Uint8Array.from(atob(PNG_BASE64), (c) => c.charCodeAt(0));
    const file = new Blob([bytes], { type: "image/png" });

    const progressEvents: unknown[] = [];
    const user = await client.uploads.uploadAvatar(file, {
      onProgress: (e) => progressEvents.push(e),
    });
    expect(user.avatarUrl).toMatch(/^\/api\/v1\/uploads\/avatars\//);
    expect(progressEvents.length).toBeGreaterThan(0);

    const served = await fetch(`${BASE_URL.replace(/\/api\/v1$/, "")}${user.avatarUrl}`);
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
    const servedBytes = new Uint8Array(await served.arrayBuffer());
    expect(servedBytes).toEqual(bytes);

    const removed = await client.users.removeAvatar();
    expect(removed.avatarUrl).toBeNull();
  });

  it("rejects a non-image file with a real 400", async () => {
    const file = new Blob([new TextEncoder().encode("not an image")], { type: "text/plain" });
    await expect(client.uploads.uploadAvatar(file)).rejects.toMatchObject({ status: 400 });
  });
});

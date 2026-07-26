import { describe, it, expect, beforeAll } from "vitest";
import { KvlClient } from "../../src/index";
import { BASE_URL, TEST_OWNER, isServerReachable } from "./setup";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe.runIf(await isServerReachable())("integration: real-time SSE stream", () => {
  let client: KvlClient;

  beforeAll(async () => {
    client = new KvlClient({ baseUrl: BASE_URL, auth: { type: "none" } });
    await client.login(TEST_OWNER.email, TEST_OWNER.password);
  });

  it("connects to the real SSE stream and receives real pushed tracking events, then a real 'closed' event on stop", async () => {
    const session = await client.sessions.create({
      title: "vitest realtime test",
      activityKind: "squat",
    });
    await client.tracking.start(session.id);

    const receivedTypes: string[] = [];
    let closedFired = false;
    client.realtime.on("tracking.event", (payload: unknown) => {
      receivedTypes.push((payload as { type: string }).type);
    });
    client.realtime.on("closed", () => {
      closedFired = true;
    });

    const disconnect = client.realtime.connect(session.id);
    await sleep(1200);

    await client.tracking.recordRep(session.id, { formScore: 88 });
    await sleep(1500); // real server polls every ~1000ms

    expect(receivedTypes).toContain("rep");

    await client.tracking.stop(session.id);
    await sleep(1500);
    expect(closedFired).toBe(true);
    expect(client.realtime.isConnected).toBe(false);

    disconnect();
  }, 10_000);
});

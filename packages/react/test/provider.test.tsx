import React from "react";
import { act } from "react";
import { describe, it, expect, vi } from "vitest";
import { KvlClient } from "@kvl/sdk";
import { KvlProvider, useKvlClient } from "../src/provider";
import { useSubscription } from "../src/use-subscription";
import { useQuery } from "../src/use-query";
import { renderInto, waitFor, jsonResponse } from "./test-utils";

describe("KvlProvider / useKvlClient", () => {
  it("exposes the real client instance to descendants via context", () => {
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "none" },
    });

    function Probe() {
      const c = useKvlClient();
      return <div data-testid="probe">{c.baseUrl}</div>;
    }

    const { container, unmount } = renderInto(
      <KvlProvider client={client}>
        <Probe />
      </KvlProvider>,
    );
    expect(container.textContent).toBe("https://example.test/api/v1");
    unmount();
  });

  it("useKvlClient() throws a clear error outside a provider", () => {
    function Probe() {
      useKvlClient();
      return null;
    }
    const originalError = console.error;
    console.error = () => {}; // React logs the thrown error to console; suppress the expected noise
    expect(() => renderInto(<Probe />)).toThrow(/must be used inside <KvlProvider>/);
    console.error = originalError;
  });
});

describe("useQuery (real react-query wiring, mocked fetch)", () => {
  it("fetches real data through the client and renders it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { email: "a@b.com" } }));
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "apiKey", apiKey: "k" },
      fetch: fetchMock,
    });

    function Profile() {
      const { data, isLoading } = useQuery(["me"], (c) => c.users.me());
      if (isLoading) return <div>loading</div>;
      return <div>{data?.email}</div>;
    }

    const { container, unmount } = renderInto(
      <KvlProvider client={client}>
        <Profile />
      </KvlProvider>,
    );
    expect(container.textContent).toBe("loading");

    await waitFor(() => expect(container.textContent).toBe("a@b.com"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    unmount();
  });
});

describe("useSubscription", () => {
  it("subscribes on mount and unsubscribes on unmount, always calling the latest handler", () => {
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "none" },
    });
    const received: unknown[] = [];

    function Listener() {
      useSubscription("custom.event", (payload) => received.push(payload));
      return <div>listening</div>;
    }

    const { unmount } = renderInto(
      <KvlProvider client={client}>
        <Listener />
      </KvlProvider>,
    );

    act(() => {
      client.emit("custom.event", { n: 1 });
    });
    expect(received).toEqual([{ n: 1 }]);

    unmount();

    client.emit("custom.event", { n: 2 });
    expect(received).toEqual([{ n: 1 }]); // no longer listening after unmount
  });
});

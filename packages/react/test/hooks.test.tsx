import React from "react";
import { act } from "react";
import { describe, it, expect, vi } from "vitest";
import { KvlClient } from "@kvl/sdk";
import { KvlProvider } from "../src/provider";
import { useMutation } from "../src/use-mutation";
import { useInfiniteQuery } from "../src/use-infinite-query";
import { useCurrentUser, useLogin } from "../src/hooks";
import { renderInto, waitFor, jsonResponse } from "./test-utils";

describe("useMutation", () => {
  it("calls the real mutationFn with the client and reports success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { success: true } }));
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "apiKey", apiKey: "k" },
      fetch: fetchMock,
    });

    function Revoker() {
      const revoke = useMutation((c, id: string) => c.apiKeys.revoke(id));
      return (
        <button onClick={() => revoke.mutate("key_1")}>
          {revoke.isSuccess ? "done" : revoke.isPending ? "pending" : "idle"}
        </button>
      );
    }

    const { container, unmount } = renderInto(
      <KvlProvider client={client}>
        <Revoker />
      </KvlProvider>,
    );
    const button = container.querySelector("button")!;
    act(() => button.click());
    await waitFor(() => expect(button.textContent).toBe("done"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    unmount();
  });
});

describe("useCurrentUser", () => {
  it("resolves the real user via GET /users/me", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { email: "me@example.com" } }));
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "apiKey", apiKey: "k" },
      fetch: fetchMock,
    });

    function Whoami() {
      const { data } = useCurrentUser();
      return <div>{data?.email ?? "loading"}</div>;
    }

    const { container, unmount } = renderInto(
      <KvlProvider client={client}>
        <Whoami />
      </KvlProvider>,
    );
    await waitFor(() => expect(container.textContent).toBe("me@example.com"));
    unmount();
  });
});

describe("useLogin", () => {
  it("calls client.login() with the real credentials passed to mutate()", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({
          data: { accessToken: "t", refreshToken: "r", expiresIn: 900, user: { email: "a@b.com" } },
        }),
      );
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "none" },
      fetch: fetchMock,
    });

    function LoginForm() {
      const login = useLogin();
      return (
        <button onClick={() => login.mutate({ email: "a@b.com", password: "pw" })}>
          {login.isSuccess ? "logged in" : "not logged in"}
        </button>
      );
    }

    const { container, unmount } = renderInto(
      <KvlProvider client={client}>
        <LoginForm />
      </KvlProvider>,
    );
    act(() => container.querySelector("button")!.click());
    await waitFor(() => expect(container.textContent).toBe("logged in"));

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/auth/login");
    unmount();
  });
});

describe("useInfiniteQuery", () => {
  it("uses the real nextCursor from PageResult to fetch subsequent pages", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ data: { items: [{ id: "s1" }], nextCursor: "cursor2", total: 2 } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: { items: [{ id: "s2" }], nextCursor: null, total: 2 } }),
      );
    const client = new KvlClient({
      baseUrl: "https://example.test/api/v1",
      auth: { type: "apiKey", apiKey: "k" },
      fetch: fetchMock,
    });

    function List() {
      const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(["sessions"], (c, cursor) =>
        c.sessions.list({ cursor }),
      );
      return (
        <div>
          <span data-testid="count">{data?.pages.flatMap((p) => p.items).length ?? 0}</span>
          {hasNextPage && <button onClick={() => fetchNextPage()}>more</button>}
        </div>
      );
    }

    const { container, unmount } = renderInto(
      <KvlProvider client={client}>
        <List />
      </KvlProvider>,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-testid="count"]')!.textContent).toBe("1"),
    );

    act(() => container.querySelector("button")!.click());
    await waitFor(() =>
      expect(container.querySelector('[data-testid="count"]')!.textContent).toBe("2"),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    unmount();
  });
});

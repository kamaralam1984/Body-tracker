import { describe, it, expect } from "vitest";
import { createMemoryTokenStore, createLocalStorageTokenStore } from "../src/token-store";

describe("createMemoryTokenStore", () => {
  it("round-trips tokens within the same process", () => {
    const store = createMemoryTokenStore();
    expect(store.getTokens()).toBeNull();
    store.setTokens({ accessToken: "a", refreshToken: "r" });
    expect(store.getTokens()).toEqual({ accessToken: "a", refreshToken: "r" });
    store.clear();
    expect(store.getTokens()).toBeNull();
  });

  it("two independent stores don't share state", () => {
    const a = createMemoryTokenStore();
    const b = createMemoryTokenStore();
    a.setTokens({ accessToken: "a", refreshToken: "ra" });
    expect(b.getTokens()).toBeNull();
  });
});

describe("createLocalStorageTokenStore", () => {
  it("safely no-ops outside a browser (no `window` global) rather than throwing", () => {
    const store = createLocalStorageTokenStore();
    expect(() => store.getTokens()).not.toThrow();
    expect(store.getTokens()).toBeNull();
    expect(() => store.setTokens({ accessToken: "a", refreshToken: "r" })).not.toThrow();
    expect(() => store.clear()).not.toThrow();
  });
});

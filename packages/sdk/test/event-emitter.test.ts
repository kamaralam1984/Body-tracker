import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "../src/event-emitter";

describe("EventEmitter", () => {
  it("calls a listener registered with on() every time the event fires", () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on("ping", handler);
    emitter.emit("ping", { n: 1 });
    emitter.emit("ping", { n: 2 });
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, { n: 1 }, "ping");
    expect(handler).toHaveBeenNthCalledWith(2, { n: 2 }, "ping");
  });

  it("once() only fires a single time then removes itself", () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.once("ping", handler);
    emitter.emit("ping");
    emitter.emit("ping");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(emitter.listenerCount("ping")).toBe(0);
  });

  it("off() removes exactly the given handler, leaving others intact", () => {
    const emitter = new EventEmitter();
    const a = vi.fn();
    const b = vi.fn();
    emitter.on("ping", a);
    emitter.on("ping", b);
    emitter.off("ping", a);
    emitter.emit("ping");
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("removeListener is an alias for off()", () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on("ping", handler);
    emitter.removeListener("ping", handler);
    emitter.emit("ping");
    expect(handler).not.toHaveBeenCalled();
  });

  it("a wildcard '*' listener receives every event", () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on("*", handler);
    emitter.emit("chat.message", { text: "hi" });
    emitter.emit("user.online", { id: "u1" });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("a namespace wildcard 'chat.*' matches only that namespace", () => {
    const emitter = new EventEmitter();
    const chatHandler = vi.fn();
    const otherHandler = vi.fn();
    emitter.on("chat.*", chatHandler);
    emitter.on("user.*", otherHandler);
    emitter.emit("chat.message");
    emitter.emit("chat.typing");
    emitter.emit("user.online");
    expect(chatHandler).toHaveBeenCalledTimes(2);
    expect(otherHandler).toHaveBeenCalledTimes(1);
  });

  it("higher-priority listeners run before lower-priority ones", () => {
    const emitter = new EventEmitter();
    const order: string[] = [];
    emitter.on("ping", () => order.push("low"), { priority: 0 });
    emitter.on("ping", () => order.push("high"), { priority: 10 });
    emitter.on("ping", () => order.push("mid"), { priority: 5 });
    emitter.emit("ping");
    expect(order).toEqual(["high", "mid", "low"]);
  });

  it("removeAllListeners() with no argument clears every pattern", () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on("a", handler);
    emitter.on("b", handler);
    emitter.removeAllListeners();
    emitter.emit("a");
    emitter.emit("b");
    expect(handler).not.toHaveBeenCalled();
  });

  it("on() returns an unsubscribe function", () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    const unsubscribe = emitter.on("ping", handler);
    unsubscribe();
    emitter.emit("ping");
    expect(handler).not.toHaveBeenCalled();
  });
});

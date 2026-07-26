/**
 * A small, dependency-free event emitter with the features real SDKs
 * (Stripe's webhooks helper, Socket.IO's client, etc.) actually ship:
 * once-listeners, priority ordering, and namespace/wildcard matching
 * ("chat.*" matches "chat.message", "*" matches everything). Used both
 * as the public `client.on(...)` surface and internally by the realtime
 * client to fan out real SSE events.
 */

export type EventHandler<T = unknown> = (payload: T, eventName: string) => void;

interface Listener {
  handler: EventHandler;
  once: boolean;
  priority: number;
}

export interface ListenOptions {
  /** Higher runs first. Ties preserve registration order. Default 0. */
  priority?: number;
}

function toMatcher(pattern: string): (eventName: string) => boolean {
  if (pattern === "*") return () => true;
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -1); // keep the trailing "."
    return (eventName) => eventName.startsWith(prefix);
  }
  return (eventName) => eventName === pattern;
}

export class EventEmitter {
  private listeners = new Map<string, Listener[]>();

  /** Registers a handler for `pattern` — an exact event name, a `"namespace.*"` wildcard, or `"*"` for everything. */
  on<T = unknown>(pattern: string, handler: EventHandler<T>, options?: ListenOptions): () => void {
    return this.register(pattern, handler as EventHandler, false, options?.priority ?? 0);
  }

  /** Same as `on`, but the handler is removed automatically after its first invocation. */
  once<T = unknown>(
    pattern: string,
    handler: EventHandler<T>,
    options?: ListenOptions,
  ): () => void {
    return this.register(pattern, handler as EventHandler, true, options?.priority ?? 0);
  }

  private register(
    pattern: string,
    handler: EventHandler,
    once: boolean,
    priority: number,
  ): () => void {
    const list = this.listeners.get(pattern) ?? [];
    list.push({ handler, once, priority });
    list.sort((a, b) => b.priority - a.priority);
    this.listeners.set(pattern, list);
    return () => this.off(pattern, handler);
  }

  /** Removes a specific handler from `pattern`. Alias: `removeListener`. */
  off(pattern: string, handler: EventHandler): void {
    const list = this.listeners.get(pattern);
    if (!list) return;
    const next = list.filter((l) => l.handler !== handler);
    if (next.length > 0) this.listeners.set(pattern, next);
    else this.listeners.delete(pattern);
  }

  removeListener = this.off.bind(this);

  /** Removes every handler, or every handler for one exact pattern if given. */
  removeAllListeners(pattern?: string): void {
    if (pattern) this.listeners.delete(pattern);
    else this.listeners.clear();
  }

  /** Fires `eventName`, invoking every listener whose pattern matches (exact, `namespace.*`, or `*`), highest priority first. */
  emit<T = unknown>(eventName: string, payload?: T): void {
    const matched: Array<{ pattern: string; listener: Listener }> = [];
    for (const [pattern, list] of this.listeners) {
      if (!toMatcher(pattern)(eventName)) continue;
      for (const listener of list) matched.push({ pattern, listener });
    }
    matched.sort((a, b) => b.listener.priority - a.listener.priority);

    for (const { pattern, listener } of matched) {
      listener.handler(payload, eventName);
      if (listener.once) this.off(pattern, listener.handler);
    }
  }

  listenerCount(pattern: string): number {
    return this.listeners.get(pattern)?.length ?? 0;
  }
}

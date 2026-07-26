"use client";

import { useEffect, useRef } from "react";
import type { EventHandler } from "@kvl/sdk";
import { useKvlClient } from "./provider";

/**
 * Subscribes to any real client event (`request.start`, `auth.session_updated`,
 * or — most usefully — anything the realtime client emits, like
 * `"tracking.event"` or `"tracking.rep"`) for the lifetime of the
 * component, unsubscribing automatically on unmount. This is the SDK's
 * real equivalent of a generic "useSubscription" hook — it subscribes to
 * genuine `KvlClient` events, not a fabricated GraphQL-style subscription
 * protocol this API doesn't have.
 *
 * @example
 * useSubscription("tracking.rep", (payload) => console.log("new rep!", payload));
 */
export function useSubscription<T = unknown>(pattern: string, handler: EventHandler<T>): void {
  const client = useKvlClient();
  const handlerRef = useRef(handler);

  // Keeps the ref current after every render without mutating it during
  // render itself (which the React Compiler correctly flags) — this is
  // the standard "latest ref" pattern: an effect with no dependency
  // array runs after every commit.
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const stableHandler: EventHandler<T> = (payload, eventName) =>
      handlerRef.current(payload, eventName);
    const unsubscribe = client.on(pattern, stableHandler as EventHandler);
    return unsubscribe;
  }, [client, pattern]);
}

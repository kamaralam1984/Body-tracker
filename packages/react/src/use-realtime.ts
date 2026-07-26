"use client";

import { useEffect, useState } from "react";
import { useKvlClient } from "./provider";

export interface RealtimeEvent {
  type: string;
  payload: unknown;
}

export interface UseRealtimeResult {
  isConnected: boolean;
  lastEvent: RealtimeEvent | null;
}

/**
 * Connects to the real tracking-session event stream (SSE — see
 * `client.realtime`/`RealtimeClient`) for as long as this component is
 * mounted with a given `sessionId`, disconnecting automatically on
 * unmount or when `sessionId` changes. There is no presence or typing-
 * indicator data to expose here — this app has no such server-side
 * capability (see `RealtimeClient`'s own doc comment) — just real
 * tracking events and connection status.
 */
export function useRealtime(sessionId: string | undefined): UseRealtimeResult {
  const client = useKvlClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const onConnected = () => setIsConnected(true);
    const onDisconnected = () => setIsConnected(false);
    const onEvent = (payload: unknown) => {
      const type = (payload as { type?: string }).type ?? "unknown";
      setLastEvent({ type, payload });
    };

    client.realtime.on("connected", onConnected);
    client.realtime.on("disconnected", onDisconnected);
    client.realtime.on("tracking.event", onEvent);

    const disconnect = client.realtime.connect(sessionId);
    // Resetting state lives in cleanup (runs on unmount AND right before
    // the next run when `sessionId` changes) rather than at the top of
    // the effect body — calling setState synchronously in an effect body
    // is what the React Compiler flags; cleanup is the sanctioned place.
    return () => {
      client.realtime.off("connected", onConnected);
      client.realtime.off("disconnected", onDisconnected);
      client.realtime.off("tracking.event", onEvent);
      disconnect();
      setIsConnected(false);
      setLastEvent(null);
    };
  }, [client, sessionId]);

  return { isConnected, lastEvent };
}

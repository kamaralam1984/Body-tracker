import type { KvlClient } from "./client";
import { EventEmitter } from "./event-emitter";

const INITIAL_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 10_000;

/**
 * Real-time client for one tracking session — wraps the actual server
 * capability (`GET /api/v1/tracking/{sessionId}/stream`, real
 * Server-Sent Events, DB-polling-backed, ~1s latency) via a hand-rolled
 * SSE parser over `fetch()` rather than the DOM `EventSource` API, so the
 * exact same code works in Node and the browser (`EventSource` isn't a
 * Node global, and it can't send a custom `Authorization` header anyway —
 * `fetch` has neither limitation).
 *
 * Deliberately does NOT claim presence, typing indicators, or a
 * WebSocket protocol — none of that exists server-side today (confirmed
 * by a full audit of `src/server/`). This wraps exactly the one real
 * real-time capability this API has.
 *
 * Real, honest limitation: reconnecting resumes from the moment of
 * reconnection — the server stream has no "since" cursor, so events that
 * occurred during a disconnected gap are never backfilled. Call
 * `client.tracking.status(sessionId)` after a reconnect if you need the
 * current state.
 */
export class RealtimeClient extends EventEmitter {
  private controller: AbortController | null = null;
  private reconnectAttempts = 0;
  private manuallyDisconnected = true;
  private currentSessionId: string | null = null;

  constructor(private client: KvlClient) {
    super();
  }

  /** Opens the real SSE connection for `sessionId`. Returns a disconnect function. Auto-reconnects (exponential backoff, capped at 10s) on any drop that wasn't caused by calling that disconnect function or a real `closed` event from the server. */
  connect(sessionId: string): () => void {
    this.manuallyDisconnected = false;
    this.currentSessionId = sessionId;
    this.reconnectAttempts = 0;
    this.run(sessionId);
    return () => this.disconnect();
  }

  disconnect(): void {
    this.manuallyDisconnected = true;
    this.controller?.abort();
    this.controller = null;
  }

  get isConnected(): boolean {
    return this.controller !== null && !this.manuallyDisconnected;
  }

  private async run(sessionId: string): Promise<void> {
    this.controller = new AbortController();
    const authHeader = this.client.auth.getAuthHeader();
    const url = new URL(
      `tracking/${sessionId}/stream`,
      this.client.baseUrl.endsWith("/") ? this.client.baseUrl : `${this.client.baseUrl}/`,
    );

    try {
      const response = await fetch(url, {
        headers: authHeader ? { Authorization: authHeader } : {},
        signal: this.controller.signal,
      });
      if (!response.ok || !response.body) {
        throw new Error(`Real-time stream request failed with status ${response.status}`);
      }

      this.reconnectAttempts = 0;
      this.emit("connected", { sessionId });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) this.handleChunk(chunk, sessionId);
      }
    } catch (error) {
      if (this.manuallyDisconnected) return;
      this.emit("error", { sessionId, error });
    }

    this.controller = null;
    if (this.manuallyDisconnected) {
      this.emit("disconnected", { sessionId, reason: "manual" });
      return;
    }
    this.emit("disconnected", { sessionId, reason: "connection_lost" });
    this.scheduleReconnect(sessionId);
  }

  private handleChunk(chunk: string, sessionId: string): void {
    let eventName = "message";
    let dataLine: string | null = null;
    for (const line of chunk.split("\n")) {
      if (line.startsWith("event:")) eventName = line.slice("event:".length).trim();
      else if (line.startsWith("data:")) dataLine = line.slice("data:".length).trim();
    }
    if (dataLine === null) return;

    let payload: unknown;
    try {
      payload = JSON.parse(dataLine);
    } catch {
      return;
    }

    if (eventName === "ping") {
      this.emit("heartbeat", { sessionId });
      return;
    }
    if (eventName === "closed") {
      this.manuallyDisconnected = true; // the server ended the stream on purpose (session completed) — not a drop to reconnect from
      this.emit("closed", { sessionId });
      this.controller?.abort();
      return;
    }

    const type = (payload as { type?: string }).type ?? "unknown";
    this.emit(`tracking.${type}`, payload);
    this.emit("tracking.event", payload);
  }

  private scheduleReconnect(sessionId: string): void {
    if (this.manuallyDisconnected || sessionId !== this.currentSessionId) return;
    this.reconnectAttempts += 1;
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempts,
      MAX_RECONNECT_DELAY_MS,
    );
    this.emit("reconnecting", { sessionId, attempt: this.reconnectAttempts, delayMs: delay });
    setTimeout(() => {
      if (!this.manuallyDisconnected && sessionId === this.currentSessionId) this.run(sessionId);
    }, delay);
  }
}

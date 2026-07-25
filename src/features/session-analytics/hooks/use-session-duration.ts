"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "../store/session-store";

/** Live-ticking session duration in milliseconds. 0 until a session has started. */
export function useSessionDuration(): number {
  const startedAt = useSessionStore((s) => s.session.startedAt);
  const status = useSessionStore((s) => s.session.status);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    // Syncing to the external system clock, not deriving from props/state — the
    // sanctioned exception, same as any ticking-timer effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    if (status !== "running") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [status, startedAt]);

  if (!startedAt || now === 0) return 0;
  return Math.max(0, now - startedAt);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Guards against hydration mismatches for client-only rendering (e.g. theme-dependent UI). */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

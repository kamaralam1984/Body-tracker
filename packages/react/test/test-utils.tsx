import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

export function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export interface RenderHandle {
  container: HTMLDivElement;
  unmount: () => void;
}

export function renderInto(node: React.ReactElement): RenderHandle {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(node);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

/** Polls (wrapped in `act()` so React state updates flush) until `assertion` stops throwing, or fails after `timeoutMs`. Real async work (fetch + react-query's internal microtask chain) needs more than a single tick to settle in a raw react-dom/client harness with no testing-library wrapper. */
export async function waitFor(assertion: () => void, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (true) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() - start > timeoutMs) throw error;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }
  }
}

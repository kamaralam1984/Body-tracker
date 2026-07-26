/**
 * `performance.memory` is a real, shipped Chrome-only API (JS heap usage) —
 * not part of the standard `Performance` type, and genuinely absent
 * elsewhere (Firefox/Safari). There is NO web API anywhere that exposes
 * true OS-level CPU/GPU utilization percentages; this app never fabricates
 * one — see developer-mode-panel.tsx and live-performance-dashboard.tsx for
 * where that's surfaced to the user.
 */

interface ChromeMemoryInfo {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}
interface PerformanceWithMemory extends Performance {
  memory?: ChromeMemoryInfo;
}

export function readJsHeapMb(): number | null {
  const memory = (performance as PerformanceWithMemory).memory;
  return memory ? memory.usedJSHeapSize / (1024 * 1024) : null;
}

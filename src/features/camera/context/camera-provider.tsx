"use client";

/**
 * Shares one `useCamera` instance across a component tree, so the toolbar,
 * settings drawer, status badge, and preview can all read/control the same
 * camera without prop drilling.
 *
 * <CameraProvider>
 *   <CameraCard />
 *   <CameraToolbar />
 * </CameraProvider>
 *
 * // Anywhere inside:
 * const { status, start, stop } = useCameraContext();
 */

import { createContext, useContext } from "react";
import { useCamera, type UseCameraOptions, type UseCameraResult } from "../hooks/use-camera";

const CameraContext = createContext<UseCameraResult | null>(null);

interface CameraProviderProps extends UseCameraOptions {
  children: React.ReactNode;
}

export function CameraProvider({ children, initialSettings }: CameraProviderProps) {
  const camera = useCamera({ initialSettings });
  return <CameraContext.Provider value={camera}>{children}</CameraContext.Provider>;
}

export function useCameraContext(): UseCameraResult {
  const ctx = useContext(CameraContext);
  if (!ctx) throw new Error("useCameraContext must be used within a CameraProvider");
  return ctx;
}

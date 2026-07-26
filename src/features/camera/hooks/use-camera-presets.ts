"use client";

/**
 * Named camera-setting presets (device/resolution/fps/mirror/adjustments) —
 * save/rename/delete/import/export. Stored in `localStorage`; export/import
 * round-trips as a plain JSON file via the shared `downloadJson` helper.
 * Applying a preset back onto the live camera is the caller's job (it needs
 * `useCameraContext()`'s individual setters) — this hook only owns the list.
 */

import { useCallback, useEffect, useState } from "react";
import { downloadJson } from "@/lib/download-file";
import type { CameraSettingsState } from "../types";

export interface CameraPreset {
  id: string;
  name: string;
  settings: CameraSettingsState;
  createdAt: string;
}

const STORAGE_KEY = "btk_camera_presets";

function readPresets(): CameraPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CameraPreset[]) : [];
  } catch {
    return [];
  }
}

function writePresets(presets: CameraPreset[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export interface UseCameraPresetsResult {
  presets: CameraPreset[];
  savePreset: (name: string, settings: CameraSettingsState) => void;
  renamePreset: (id: string, name: string) => void;
  deletePreset: (id: string) => void;
  exportPreset: (preset: CameraPreset) => void;
  importPreset: (file: File) => Promise<void>;
}

export function useCameraPresets(): UseCameraPresetsResult {
  const [presets, setPresets] = useState<CameraPreset[]>([]);

  useEffect(() => {
    // One-time hydration read — localStorage doesn't exist during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPresets(readPresets());
  }, []);

  const savePreset = useCallback((name: string, settings: CameraSettingsState) => {
    setPresets((prev) => {
      const preset: CameraPreset = {
        id: crypto.randomUUID(),
        name,
        settings,
        createdAt: new Date().toISOString(),
      };
      const next = [...prev, preset];
      writePresets(next);
      return next;
    });
  }, []);

  const renamePreset = useCallback((id: string, name: string) => {
    setPresets((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, name } : p));
      writePresets(next);
      return next;
    });
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      writePresets(next);
      return next;
    });
  }, []);

  const exportPreset = useCallback((preset: CameraPreset) => {
    downloadJson(`camera-preset-${preset.name.toLowerCase().replace(/\s+/g, "-")}.json`, preset);
  }, []);

  const importPreset = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as CameraPreset;
    setPresets((prev) => {
      const next = [...prev, { ...parsed, id: crypto.randomUUID() }];
      writePresets(next);
      return next;
    });
  }, []);

  return { presets, savePreset, renamePreset, deletePreset, exportPreset, importPreset };
}

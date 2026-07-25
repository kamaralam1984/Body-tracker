import type { ResolutionOption, ResolutionPreset } from "../types";

export const RESOLUTION_OPTIONS: ResolutionOption[] = [
  { value: "auto", label: "Auto" },
  { value: "480p", label: "480p", width: 640, height: 480 },
  { value: "720p", label: "720p HD", width: 1280, height: 720 },
  { value: "1080p", label: "1080p Full HD", width: 1920, height: 1080 },
  { value: "1440p", label: "2K", width: 2560, height: 1440 },
  { value: "2160p", label: "4K", width: 3840, height: 2160 },
];

export function getResolutionDimensions(preset: ResolutionPreset) {
  return RESOLUTION_OPTIONS.find((option) => option.value === preset);
}

export const FRAME_RATE_OPTIONS = [15, 24, 30, 60] as const;

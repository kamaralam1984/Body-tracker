export interface CameraKeyboardShortcut {
  key: string;
  action: string;
}

/** Single source of truth for the camera page's shortcut list — the actual key handling lives next to whichever component owns that state (camera-toolbar.tsx, fullscreen-button.tsx, picture-in-picture-button.tsx, recording-export-panel.tsx); this is only the display copy. */
export const CAMERA_KEYBOARD_SHORTCUTS: CameraKeyboardShortcut[] = [
  { key: "Space", action: "Start / pause camera" },
  { key: "M", action: "Toggle mirror" },
  { key: "S", action: "Take screenshot" },
  { key: "C", action: "Flip camera" },
  { key: "G", action: "Cycle grid overlay" },
  { key: "F", action: "Toggle fullscreen" },
  { key: "P", action: "Toggle picture-in-picture" },
  { key: "R", action: "Start / stop recording" },
  { key: "Esc", action: "Exit fullscreen" },
];

import type { CameraError, CameraErrorKind } from "../types";

const NAME_TO_KIND: Record<string, CameraErrorKind> = {
  NotAllowedError: "permission-denied",
  PermissionDeniedError: "permission-denied",
  SecurityError: "permission-denied",
  NotFoundError: "device-not-found",
  DevicesNotFoundError: "device-not-found",
  NotReadableError: "camera-busy",
  TrackStartError: "camera-busy",
  OverconstrainedError: "constraint-error",
  ConstraintNotSatisfiedError: "constraint-error",
};

const FRIENDLY_MESSAGE: Record<CameraErrorKind, string> = {
  "permission-denied":
    "Camera access was denied. Allow camera permission in your browser to continue.",
  "device-not-found": "No camera was found on this device.",
  "camera-busy": "The camera is already in use by another application.",
  "browser-unsupported": "Your browser doesn't support camera access.",
  "constraint-error": "The selected camera settings aren't supported by this device.",
  unknown: "Something went wrong while accessing the camera.",
};

export function mapCameraError(error: unknown): CameraError {
  if (error instanceof DOMException) {
    const kind = NAME_TO_KIND[error.name] ?? "unknown";
    return { kind, message: FRIENDLY_MESSAGE[kind], original: error };
  }

  if (error instanceof Error && error.message.toLowerCase().includes("not supported")) {
    return {
      kind: "browser-unsupported",
      message: FRIENDLY_MESSAGE["browser-unsupported"],
      original: error,
    };
  }

  return { kind: "unknown", message: FRIENDLY_MESSAGE.unknown, original: error };
}

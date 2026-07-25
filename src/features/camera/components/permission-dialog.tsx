"use client";

/**
 * Modal camera-permission flow. Adapts its content to the camera's current
 * status — pre-prompt explanation, in-flight "waiting on the browser"
 * state, or post-denial recovery instructions — and auto-closes itself
 * once the camera actually comes up, so callers never have to remember to
 * close it on success.
 *
 * <PermissionDialog open={showPermission} onClose={() => setShowPermission(false)} />
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ShieldAlert, X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useCameraContext } from "../context/camera-provider";

type BrowserKind = "chrome" | "edge" | "firefox" | "safari" | "other";

function detectBrowser(): BrowserKind {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "edge";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "chrome";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "safari";
  return "other";
}

const BROWSER_LABEL: Record<BrowserKind, string> = {
  chrome: "Chrome",
  edge: "Edge",
  firefox: "Firefox",
  safari: "Safari",
  other: "your browser",
};

const RECOVERY_STEPS: Record<BrowserKind, string[]> = {
  chrome: [
    "Click the camera icon in the address bar.",
    'Choose "Always allow" for this site.',
    "Reload the page.",
  ],
  edge: [
    "Click the camera icon in the address bar.",
    'Choose "Allow" for this site.',
    "Reload the page.",
  ],
  firefox: [
    "Click the camera icon in the address bar.",
    'Clear the block, then choose "Allow".',
    "Reload the page.",
  ],
  safari: [
    "Open Safari → Settings → Websites → Camera.",
    'Find this site in the list and set it to "Allow".',
    "Reload the page.",
  ],
  other: [
    "Open this site's permissions in your browser settings.",
    "Allow camera access for this site.",
    "Reload the page.",
  ],
};

interface PermissionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PermissionDialog({ open, onClose }: PermissionDialogProps) {
  const { status, error, start } = useCameraContext();
  const [browser] = useState<BrowserKind>(detectBrowser);

  // Progressive enhancement: where the Permissions API is available (not
  // reliably on Safari), proactively flag an already-denied permission so
  // the denied/recovery screen can show immediately instead of waiting for
  // a doomed `start()` call to round-trip through getUserMedia first.
  const [queriedDenied, setQueriedDenied] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    let cancelled = false;
    let permissionStatus: PermissionStatus | undefined;

    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((result) => {
        if (cancelled) return;
        permissionStatus = result;
        setQueriedDenied(result.state === "denied");
        result.onchange = () => setQueriedDenied(result.state === "denied");
      })
      .catch(() => {
        // Unsupported (e.g. Safari) — fall back entirely to reactive status.
      });

    return () => {
      cancelled = true;
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, []);

  const isInitializing = status === "initializing";
  const isDenied =
    status === "permission-denied" ||
    (queriedDenied && !isInitializing && status !== "ready" && status !== "running");
  const dismissible = !isInitializing;

  useEscapeKey(onClose, open && dismissible);
  useLockBodyScroll(open);

  // Auto-close once the camera actually comes up — callers don't need to
  // watch `status` themselves.
  useEffect(() => {
    if (status === "ready" || status === "running") onClose();
  }, [status, onClose]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={dismissible ? onClose : undefined}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px] dark:bg-black/60"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="permission-dialog-title"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="border-border bg-surface-elevated relative z-10 flex w-full max-w-sm flex-col overflow-hidden rounded-xl border shadow-2xl"
            >
              {dismissible && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-4 right-4 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
                >
                  <X className="size-4" />
                </button>
              )}

              <div className="flex flex-col items-center gap-4 p-6 pt-9 text-center">
                {isDenied ? (
                  <>
                    <div className="bg-danger-bg flex size-14 items-center justify-center rounded-full">
                      <ShieldAlert className="text-danger-600 size-6" strokeWidth={1.75} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h2
                        id="permission-dialog-title"
                        className="text-foreground text-base font-semibold"
                      >
                        Camera access is blocked
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        {error?.message ?? "Your browser blocked camera access for this site."} We
                        can&apos;t re-open the permission prompt automatically — allow access in{" "}
                        {BROWSER_LABEL[browser]}, then reload this page.
                      </p>
                    </div>
                    <ol className="bg-muted text-muted-foreground marker:text-foreground/60 w-full list-decimal space-y-1.5 rounded-lg px-5 py-3 text-left text-sm">
                      {RECOVERY_STEPS[browser].map((step) => (
                        <li key={step} className="pl-1">
                          {step}
                        </li>
                      ))}
                    </ol>
                    <div className="flex w-full gap-3 pt-1">
                      <Button variant="secondary" className="flex-1" onClick={onClose}>
                        Not now
                      </Button>
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={() => window.location.reload()}
                      >
                        Reload page
                      </Button>
                    </div>
                  </>
                ) : isInitializing ? (
                  <>
                    <div className="bg-accent-100 dark:bg-accent-900 flex size-14 items-center justify-center rounded-full">
                      <Spinner size="lg" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h2
                        id="permission-dialog-title"
                        className="text-foreground text-base font-semibold"
                      >
                        Waiting for your response…
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        Respond to the permission prompt from your browser to continue.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-accent-100 dark:bg-accent-900 flex size-14 items-center justify-center rounded-full">
                      <Camera className="text-accent size-6" strokeWidth={1.75} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h2
                        id="permission-dialog-title"
                        className="text-foreground text-base font-semibold"
                      >
                        Allow camera access
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        We need access to your camera to start your session preview. Nothing is
                        recorded or shared until you choose to.
                      </p>
                    </div>
                    <div className="flex w-full gap-3 pt-1">
                      <Button variant="secondary" className="flex-1" onClick={onClose}>
                        Not now
                      </Button>
                      <Button variant="primary" className="flex-1" onClick={() => start()}>
                        Allow camera access
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

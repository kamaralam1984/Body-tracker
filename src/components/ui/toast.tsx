"use client";

/**
 * Toast / notification system.
 *
 * Mount once near the root of the app (e.g. in the root layout):
 *
 *   import { ToastProvider } from "@/components/ui/toast";
 *   export default function RootLayout({ children }) {
 *     return (<html><body>{children}<ToastProvider /></body></html>);
 *   }
 *
 * Then call the `toast` helper from anywhere, including outside components:
 *
 *   import { toast } from "@/components/ui/toast";
 *   toast.success("Saved");
 *   toast.error("Something went wrong", { description: "Please try again." });
 *   toast.info("Heads up", { action: { label: "Undo", onClick: () => {} } });
 *   toast.promise(saveUser(), {
 *     loading: "Saving...",
 *     success: "Saved!",
 *     error: (err) => `Failed: ${String(err)}`,
 *   });
 *
 * `useToast()` returns the same API for use inside components.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  CircleX,
  Info,
  Loader2,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { Portal } from "./portal";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "warning" | "danger" | "info" | "loading";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  description?: string;
  action?: ToastAction;
  /** ms; `Infinity` disables auto-dismiss. Defaults to 4000 (loading toasts default to Infinity). */
  duration?: number;
}

export interface ToastData {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  action?: ToastAction;
  duration: number;
  /** Reset whenever the toast's content/duration changes (e.g. promise settling), used to restart the auto-dismiss timer. */
  updatedAt: number;
}

interface PromiseMessages<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: unknown) => string);
}

const DEFAULT_DURATION = 4000;
const MAX_VISIBLE = 5;

/* ------------------------------------------------------------------ */
/* Module-level store (simple pub/sub, no external state library)      */
/* ------------------------------------------------------------------ */

let toasts: ToastData[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

function getServerSnapshot() {
  return toasts;
}

function genId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function addToast(variant: ToastVariant, title: string, opts?: ToastOptions): string {
  const id = genId();
  const duration = opts?.duration ?? (variant === "loading" ? Infinity : DEFAULT_DURATION);
  const data: ToastData = {
    id,
    variant,
    title,
    description: opts?.description,
    action: opts?.action,
    duration,
    updatedAt: Date.now(),
  };
  toasts = [data, ...toasts];
  emit();
  return id;
}

function updateToast(id: string, patch: Partial<Omit<ToastData, "id" | "updatedAt">>) {
  toasts = toasts.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t));
  emit();
}

function dismiss(id?: string) {
  toasts = id === undefined ? [] : toasts.filter((t) => t.id !== id);
  emit();
}

function promise<T>(value: Promise<T>, messages: PromiseMessages<T>): string {
  const id = addToast("loading", messages.loading);
  value.then(
    (data) => {
      const title =
        typeof messages.success === "function" ? messages.success(data) : messages.success;
      updateToast(id, { variant: "success", title, duration: DEFAULT_DURATION });
    },
    (error: unknown) => {
      const title = typeof messages.error === "function" ? messages.error(error) : messages.error;
      updateToast(id, { variant: "danger", title, duration: DEFAULT_DURATION });
    },
  );
  return id;
}

export const toast = {
  success: (message: string, opts?: ToastOptions) => addToast("success", message, opts),
  warning: (message: string, opts?: ToastOptions) => addToast("warning", message, opts),
  error: (message: string, opts?: ToastOptions) => addToast("danger", message, opts),
  info: (message: string, opts?: ToastOptions) => addToast("info", message, opts),
  loading: (message: string, opts?: ToastOptions) => addToast("loading", message, opts),
  dismiss,
  promise,
};

/** Hook form of the `toast` API, for use inside components. */
export function useToast() {
  return toast;
}

/* ------------------------------------------------------------------ */
/* Visuals                                                             */
/* ------------------------------------------------------------------ */

const icons: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: CircleX,
  info: Info,
  loading: Loader2,
};

const iconStyles: Record<ToastVariant, string> = {
  success: "text-success-600 dark:text-success-500",
  warning: "text-warning-600 dark:text-warning-500",
  danger: "text-danger-600 dark:text-danger-500",
  info: "text-info-600 dark:text-info-500",
  loading: "text-muted-foreground",
};

function ToastItem({ data }: { data: ToastData }) {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(data.duration);

  // Reset the remaining time whenever the toast's content changes (e.g. a
  // loading toast resolving into a success/error toast via toast.promise).
  useEffect(() => {
    remainingRef.current = data.duration;
  }, [data.duration, data.updatedAt]);

  useEffect(() => {
    if (!Number.isFinite(data.duration) || paused) return;
    const start = Date.now();
    const timer = setTimeout(() => dismiss(data.id), remainingRef.current);
    return () => {
      clearTimeout(timer);
      remainingRef.current -= Date.now() - start;
    };
  }, [paused, data.duration, data.updatedAt, data.id]);

  const Icon = icons[data.variant];
  const isAssertive = data.variant === "danger";
  const role = data.variant === "danger" || data.variant === "warning" ? "alert" : "status";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] } }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      role={role}
      aria-live={isAssertive ? "assertive" : "polite"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="border-border bg-surface-elevated pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg"
    >
      <Icon
        className={cn(
          "mt-0.5 size-5 shrink-0",
          iconStyles[data.variant],
          data.variant === "loading" && "animate-spin",
        )}
        strokeWidth={1.75}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-foreground text-sm font-medium">{data.title}</p>
        {data.description && <p className="text-muted-foreground text-sm">{data.description}</p>}
        {data.action && (
          <button
            type="button"
            onClick={() => {
              data.action?.onClick();
              dismiss(data.id);
            }}
            className="text-accent-600 focus-visible:ring-ring/40 dark:text-accent-400 mt-1 self-start rounded-xs text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {data.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(data.id)}
        aria-label="Dismiss notification"
        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/40 flex size-6 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <X className="size-4" strokeWidth={1.75} />
      </button>
    </motion.div>
  );
}

/**
 * Renders the toast viewport (fixed bottom-right). Mount once, near the
 * root of the app. Newest toasts appear closest to the screen edge; the
 * stack grows upward and reflows with a `layout` animation as toasts are
 * added/removed. Only the `MAX_VISIBLE` most recent toasts are shown.
 */
export function ToastProvider() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const visible = items.slice(0, MAX_VISIBLE);

  return (
    <Portal>
      <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-full max-w-sm flex-col-reverse gap-2">
        <AnimatePresence initial={false}>
          {visible.map((item) => (
            <ToastItem key={item.id} data={item} />
          ))}
        </AnimatePresence>
      </div>
    </Portal>
  );
}

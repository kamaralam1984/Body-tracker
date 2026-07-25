"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Portal } from "./portal";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
} as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: keyof typeof sizeMap;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEscapeKey(onClose, open);
  useLockBodyScroll(open);

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
              onClick={onClose}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px] dark:bg-black/60"
            />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? "modal-title" : undefined}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "border-border bg-surface-elevated relative z-10 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-xl border shadow-2xl",
                sizeMap[size],
              )}
            >
              {(title || description) && (
                <div className="border-border-subtle flex items-start justify-between gap-4 border-b p-6 pb-4">
                  <div className="flex flex-col gap-1">
                    {title && (
                      <h2 id="modal-title" className="text-foreground text-base font-semibold">
                        {title}
                      </h2>
                    )}
                    {description && <p className="text-muted-foreground text-sm">{description}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-6 pt-4">{children}</div>
              {footer && (
                <div className="border-border-subtle flex items-center justify-end gap-3 border-t p-6 pt-4">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Portal } from "./portal";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  side?: "right" | "left";
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  side = "right",
  children,
  footer,
  className,
}: DrawerProps) {
  useEscapeKey(onClose, open);
  useLockBodyScroll(open);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px] dark:bg-black/60"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ x: side === "right" ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: side === "right" ? "100%" : "-100%" }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "border-border bg-surface-elevated relative z-10 flex h-full w-full max-w-md flex-col shadow-2xl",
                side === "right" ? "ml-auto border-l" : "mr-auto border-r",
                className,
              )}
            >
              {(title || description) && (
                <div className="border-border-subtle flex items-start justify-between gap-4 border-b p-6 pb-4">
                  <div className="flex flex-col gap-1">
                    {title && <h2 className="text-foreground text-base font-semibold">{title}</h2>}
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

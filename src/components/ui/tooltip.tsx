"use client";

import { useLayoutEffect, useRef, useState, cloneElement, isValidElement } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Portal } from "./portal";
import { computePosition, type Placement } from "@/lib/floating";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: Placement;
  delay?: number;
}

export function Tooltip({ content, children, placement = "top", delay = 300 }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !contentRef.current) return;
    const pos = computePosition(
      triggerRef.current.getBoundingClientRect(),
      contentRef.current.getBoundingClientRect(),
      { placement, offset: 6 },
    );
    setStyle({ top: pos.top, left: pos.left });
  }, [open, placement]);

  const show = () => {
    timeoutRef.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clearTimeout(timeoutRef.current);
    setOpen(false);
  };

  if (!isValidElement(children)) return children;

  // Forwarding a ref through cloneElement is the established pattern for anchoring
  // to an arbitrary trigger element without imposing a wrapper node.
  /* eslint-disable react-hooks/refs */
  const trigger = cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    ref: triggerRef,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  });
  /* eslint-enable react-hooks/refs */

  return (
    <>
      {trigger}
      <Portal>
        <AnimatePresence>
          {open && (
            <motion.div
              ref={contentRef}
              role="tooltip"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className={cn(
                "fixed z-50 rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-neutral-50 shadow-lg dark:bg-neutral-100 dark:text-neutral-900",
                !style && "invisible",
              )}
              style={{ top: style?.top ?? 0, left: style?.left ?? 0 }}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}

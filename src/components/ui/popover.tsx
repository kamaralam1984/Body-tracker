"use client";

import {
  cloneElement,
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Portal } from "./portal";
import { useClickOutside } from "@/hooks/use-click-outside";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { computePosition, type Placement } from "@/lib/floating";
import { cn } from "@/lib/utils";

interface PopoverProps {
  trigger: ReactElement;
  children: React.ReactNode;
  placement?: Placement;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({
  trigger,
  children,
  placement = "bottom-start",
  className,
  open: controlledOpen,
  onOpenChange,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (value: boolean) => {
    setUncontrolledOpen(value);
    onOpenChange?.(value);
  };

  const [style, setStyle] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !contentRef.current) return;
    const pos = computePosition(
      triggerRef.current.getBoundingClientRect(),
      contentRef.current.getBoundingClientRect(),
      { placement, offset: 8 },
    );
    setStyle({ top: pos.top, left: pos.left });
  }, [open, placement]);

  useClickOutside(contentRef, () => setOpen(false), open);
  useEscapeKey(() => setOpen(false), open);

  if (!isValidElement(trigger)) return trigger;

  // Forwarding a ref through cloneElement is the established pattern for anchoring
  // to an arbitrary trigger element without imposing a wrapper node.
  // eslint-disable-next-line react-hooks/refs
  const triggerEl = cloneElement(trigger as ReactElement<Record<string, unknown>>, {
    ref: triggerRef,
    onClick: () => setOpen(!open),
    "aria-expanded": open,
  });

  return (
    <>
      {triggerEl}
      <Portal>
        <AnimatePresence>
          {open && (
            <motion.div
              ref={contentRef}
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "border-border bg-surface-elevated fixed z-50 min-w-48 rounded-lg border p-1.5 shadow-lg",
                !style && "invisible",
                className,
              )}
              style={{ top: style?.top ?? 0, left: style?.left ?? 0 }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}

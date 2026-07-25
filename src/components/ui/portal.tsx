"use client";

import { createPortal } from "react-dom";
import { useMounted } from "@/hooks/use-mounted";

interface PortalProps {
  children: React.ReactNode;
  container?: Element;
}

export function Portal({ children, container }: PortalProps) {
  const mounted = useMounted();
  if (!mounted) return null;
  return createPortal(children, container ?? document.body);
}

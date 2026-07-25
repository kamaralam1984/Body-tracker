"use client";

/**
 * Accordion — accessible, animated collapsible sections built on Radix UI.
 *
 * @example Single mode (only one item open at a time, collapsible)
 * <Accordion type="single" collapsible defaultValue="item-1">
 *   <AccordionItem value="item-1">
 *     <AccordionTrigger>What is included?</AccordionTrigger>
 *     <AccordionContent>Everything you need to get started.</AccordionContent>
 *   </AccordionItem>
 * </Accordion>
 *
 * @example Multiple mode (any number of items open independently)
 * <Accordion type="multiple" defaultValue={["item-1"]}>
 *   <AccordionItem value="item-1">
 *     <AccordionTrigger>Billing</AccordionTrigger>
 *     <AccordionContent>Manage your plan and invoices.</AccordionContent>
 *   </AccordionItem>
 * </Accordion>
 */

import { forwardRef } from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Keyframes for the content expand/collapse animation, scoped locally to this
 * component so no changes to globals.css are required. Driven by Radix's own
 * `--radix-accordion-content-height` custom property, which is kept in sync
 * with the content's measured height — this avoids the layout jank that a
 * JS-measured (e.g. framer-motion "auto" height) approach can introduce, and
 * lets Radix's built-in animationend detection handle unmounting correctly.
 */
const ACCORDION_KEYFRAMES = `
@keyframes accordion-down {
  from { height: 0; }
  to { height: var(--radix-accordion-content-height); }
}
@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height); }
  to { height: 0; }
}
`;

export const Accordion = forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Root ref={ref} className={cn(className)} {...props}>
    <style>{ACCORDION_KEYFRAMES}</style>
    {children}
  </AccordionPrimitive.Root>
));
Accordion.displayName = "Accordion";

export const AccordionItem = forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-border border-b last:border-0", className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

export const AccordionTrigger = forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "group text-foreground flex flex-1 items-center justify-between gap-4 py-4 text-left text-sm font-medium",
        "hover:text-accent transition-colors duration-150",
        "focus-visible:ring-ring/40 focus-visible:ring-2 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown
        strokeWidth={1.75}
        className="text-muted-foreground ease-premium size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

export const AccordionContent = forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      "text-muted-foreground overflow-hidden text-sm",
      "data-[state=open]:animate-[accordion-down_var(--duration-base)_var(--ease-premium)]",
      "data-[state=closed]:animate-[accordion-up_var(--duration-base)_var(--ease-premium)]",
      className,
    )}
    {...props}
  >
    <div className="pt-0 pb-4">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = "AccordionContent";

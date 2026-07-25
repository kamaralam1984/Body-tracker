"use client";

/**
 * <ButtonGroup><Button>Day</Button><Button>Week</Button><Button>Month</Button></ButtonGroup>
 * <SplitButton label="Publish" onClick={publish} menu={<DropdownMenuItem onSelect={schedule}>Schedule</DropdownMenuItem>} />
 * <FloatingActionButton aria-label="New session"><Plus /></FloatingActionButton>
 */

import { ChevronDown } from "lucide-react";
import { Button, type ButtonProps } from "./button";
import { DropdownMenu } from "./dropdown-menu";
import { cn } from "@/lib/utils";

interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

/** Visually merges adjacent buttons into one segmented control (shared borders, squared inner corners). */
export function ButtonGroup({ children, className }: ButtonGroupProps) {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex items-center [&>*]:relative [&>*]:rounded-none [&>*]:focus-visible:z-10 [&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md [&>*:not(:first-child)]:-ml-px",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface SplitButtonProps extends Omit<ButtonProps, "children"> {
  label: React.ReactNode;
  menu: React.ReactNode;
}

/** A primary action button with an attached caret that opens a menu of secondary actions. */
export function SplitButton({
  label,
  menu,
  variant = "primary",
  size = "md",
  className,
  ...props
}: SplitButtonProps) {
  return (
    <ButtonGroup className={className}>
      <Button variant={variant} size={size} {...props}>
        {label}
      </Button>
      <DropdownMenu
        placement="bottom-end"
        trigger={
          <Button variant={variant} size={size} aria-label="More actions" className="px-2">
            <ChevronDown />
          </Button>
        }
      >
        {menu}
      </DropdownMenu>
    </ButtonGroup>
  );
}

/** Fixed-position circular action button for the primary page action on small screens. */
export function FloatingActionButton({ className, ...props }: ButtonProps) {
  return (
    <Button
      size="icon"
      variant="primary"
      className={cn(
        "fixed right-6 bottom-6 z-40 size-14 rounded-full shadow-xl hover:shadow-2xl [&_svg]:size-5",
        className,
      )}
      {...props}
    />
  );
}

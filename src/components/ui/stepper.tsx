"use client";

/**
 * Multi-step progress indicator (horizontal by default, vertical optional).
 *
 * Usage:
 *   <Stepper
 *     steps={[{ label: "Details" }, { label: "Review", description: "Confirm info" }, { label: "Done" }]}
 *     currentStep={1}
 *   />
 *   <Stepper steps={steps} currentStep={2} orientation="vertical" />
 *
 * `currentStep` is 0-indexed. Steps before it are completed (check icon),
 * the step at that index is active, and later steps are upcoming.
 */

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface StepperStep {
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

type StepState = "completed" | "current" | "upcoming";

function getStepState(index: number, currentStep: number): StepState {
  if (index < currentStep) return "completed";
  if (index === currentStep) return "current";
  return "upcoming";
}

function StepBadge({ state, index }: { state: StepState; index: number }) {
  return (
    <motion.div
      initial={false}
      animate={{ scale: state === "current" ? 1.05 : 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "ease-standard relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors duration-200",
        state === "completed" && "bg-accent text-accent-foreground",
        state === "current" && "border-accent bg-surface text-accent border-2",
        state === "upcoming" && "border-border bg-surface text-muted-foreground border",
      )}
    >
      {state === "completed" ? <Check className="size-4" strokeWidth={1.75} /> : index + 1}
    </motion.div>
  );
}

function Connector({
  filled,
  orientation,
}: {
  filled: boolean;
  orientation: "horizontal" | "vertical";
}) {
  return (
    <div
      className={cn(
        "bg-border relative shrink-0",
        orientation === "horizontal" ? "h-0.5 flex-1" : "w-0.5 flex-1",
      )}
    >
      <motion.div
        initial={false}
        animate={
          orientation === "horizontal"
            ? { width: filled ? "100%" : "0%" }
            : { height: filled ? "100%" : "0%" }
        }
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "bg-accent absolute inset-0",
          orientation === "horizontal" ? "h-full" : "w-full",
        )}
      />
    </div>
  );
}

export function Stepper({
  steps,
  currentStep,
  orientation = "horizontal",
  className,
}: StepperProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <ol
      className={cn(
        "flex",
        isHorizontal ? "w-full flex-row items-start" : "flex-col items-stretch gap-0",
        className,
      )}
    >
      {steps.map((step, index) => {
        const state = getStepState(index, currentStep);
        const isLast = index === steps.length - 1;

        return (
          <li
            key={step.label}
            className={cn(
              "flex",
              isHorizontal ? "flex-1 flex-col items-center" : "flex-row items-stretch gap-3",
            )}
          >
            <div className={cn("flex items-center", isHorizontal ? "w-full" : "flex-col")}>
              <StepBadge state={state} index={index} />
              {!isLast && <Connector filled={index < currentStep} orientation={orientation} />}
            </div>
            <div
              className={cn(
                "flex flex-col",
                isHorizontal
                  ? "mt-2 max-w-[9rem] items-center text-center"
                  : cn("pt-0.5 text-left", !isLast && "pb-6"),
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium",
                  state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {step.label}
              </span>
              {step.description && (
                <span className="text-muted-foreground text-xs">{step.description}</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

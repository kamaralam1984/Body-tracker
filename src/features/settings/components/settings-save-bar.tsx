"use client";

/**
 * The "Unsaved changes" banner + save indicator every settings form should
 * use — a sticky bottom bar that appears only while `visible` (typically a
 * form's `formState.isDirty` from React Hook Form). Reused across
 * Profile/Appearance/Camera & Tracking/Language & Region rather than each
 * page building its own.
 *
 * <SettingsSaveBar visible={isDirty} saving={isSubmitting} onSave={handleSubmit(onSubmit)} onDiscard={() => reset()} />
 */

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface SettingsSaveBarProps {
  visible: boolean;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  className?: string;
}

export function SettingsSaveBar({
  visible,
  saving,
  onSave,
  onDiscard,
  className,
}: SettingsSaveBarProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "border-border bg-surface-elevated fixed inset-x-0 bottom-6 z-30 mx-auto flex w-fit items-center gap-4 rounded-xl border px-4 py-3 shadow-lg",
            className,
          )}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="text-warning-500 size-4 shrink-0" strokeWidth={2} />
            <span className="text-foreground text-sm font-medium">You have unsaved changes</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
              Discard
            </Button>
            <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>
              {saving && <Spinner size="sm" />}
              Save changes
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

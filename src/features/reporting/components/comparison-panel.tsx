"use client";

/** Titled section wrapping a grid of `ComparisonCard`s. Period labels are the caller's concern. */

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ComparisonResult } from "../types";
import { ComparisonCard } from "./comparison-card";

export interface ComparisonPanelProps {
  comparisons: ComparisonResult[];
  title?: string;
  className?: string;
}

export function ComparisonPanel({ comparisons, title, className }: ComparisonPanelProps) {
  return (
    <Card className={cn("p-0", className)}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {comparisons.map((comparison, index) => (
            <motion.div
              key={comparison.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
            >
              <ComparisonCard comparison={comparison} className="h-full" />
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

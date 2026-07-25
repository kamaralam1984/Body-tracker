"use client";

/**
 * Small icon button that rasterizes the chart inside `targetRef` and
 * downloads it as a PNG. Drop it into any `AnalyticsCard`'s `action` slot:
 *
 * const chartRef = useRef<HTMLDivElement>(null);
 * <AnalyticsCard title="Tracking quality" action={<ChartDownloadButton targetRef={chartRef} filename="tracking-quality" />}>
 *   <div ref={chartRef}><ChartLine ... /></div>
 * </AnalyticsCard>
 */

import { useState, type RefObject } from "react";
import { Download } from "lucide-react";
import { Button } from "../button";
import { Spinner } from "../spinner";
import { toast } from "../toast";
import { exportChartAsPng } from "@/lib/chart-export";

interface ChartDownloadButtonProps {
  targetRef: RefObject<HTMLElement | null>;
  filename: string;
  className?: string;
}

export function ChartDownloadButton({ targetRef, filename, className }: ChartDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleClick() {
    if (!targetRef.current || downloading) return;
    setDownloading(true);
    try {
      await exportChartAsPng(targetRef.current, filename);
      toast.success("Chart downloaded");
    } catch {
      toast.error("Couldn't download this chart");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Download chart as image"
      onClick={handleClick}
      disabled={downloading}
      className={className}
    >
      {downloading ? <Spinner size="sm" /> : <Download />}
    </Button>
  );
}

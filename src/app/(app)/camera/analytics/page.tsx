import type { Metadata } from "next";
import { AnalyticsView } from "./analytics-view";

export const metadata: Metadata = { title: "Session Analytics" };

export default function CameraAnalyticsPage() {
  return <AnalyticsView />;
}

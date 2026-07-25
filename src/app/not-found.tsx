import type { Metadata } from "next";
import { ErrorLayout } from "@/components/layout/error-layout";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <ErrorLayout
      code="404"
      title="Page not found"
      description="The page you're looking for doesn't exist or may have been moved."
    />
  );
}

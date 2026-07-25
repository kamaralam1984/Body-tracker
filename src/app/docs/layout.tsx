import type { Metadata } from "next";
import { DocsLayout } from "@/features/docs";

export const metadata: Metadata = {
  title: {
    default: "Body Tracker Docs",
    template: "%s · Body Tracker Docs",
  },
  description: "Documentation for the @bodytracker/sdk developer platform.",
};

export default function DocsSectionLayout({ children }: { children: React.ReactNode }) {
  return <DocsLayout>{children}</DocsLayout>;
}

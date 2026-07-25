import { IntelligenceLayout } from "@/components/layout/intelligence-layout";

export default function IntelligenceSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Intelligence</h1>
        <p className="text-muted-foreground text-sm">
          A calm, human-language read on focus, movement, posture, and wellbeing.
        </p>
      </div>
      <IntelligenceLayout>{children}</IntelligenceLayout>
    </div>
  );
}

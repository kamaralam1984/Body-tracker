import { Alert } from "@/components/ui/alert";
import { CodeBlock } from "@/features/docs/components/code-block";
import { TableOfContents } from "@/features/docs/components/table-of-contents";
import { MIGRATION_GUIDES } from "@/features/docs/lib/migration-content";
import type { MigrationGuideDoc, TocHeading } from "@/features/docs/types";

function guideId(guide: MigrationGuideDoc): string {
  return `v${guide.fromVersion.replace(/\./g, "-")}-to-v${guide.toVersion.replace(/\./g, "-")}`;
}

function stepId(guide: MigrationGuideDoc, index: number): string {
  return `${guideId(guide)}-step-${index + 1}`;
}

const HEADINGS: TocHeading[] = MIGRATION_GUIDES.flatMap((guide) => [
  { id: guideId(guide), text: `v${guide.fromVersion} → v${guide.toVersion}`, depth: 2 as const },
  ...guide.steps.map((step, index) => ({
    id: stepId(guide, index),
    text: step.title,
    depth: 3 as const,
  })),
]);

export default function MigrationGuidePage() {
  return (
    <div className="flex gap-12">
      <article className="flex max-w-3xl min-w-0 flex-1 flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Migration guide</h1>
          <p className="text-muted-foreground text-lg">
            Step-by-step instructions for crossing each major-version boundary in{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              @bodytracker/sdk
            </code>
            . Minor and patch releases are always backwards compatible — only major versions require
            code changes.
          </p>
        </div>

        <Alert variant="danger" title="This guide covers breaking changes">
          <p>
            Each section below corresponds to a major version bump and lists every breaking change
            introduced at that boundary, followed by concrete before/after steps. If you&apos;re
            jumping multiple majors (e.g. v1.x straight to v3.0), work through both sections in
            order.
          </p>
        </Alert>

        <div className="flex flex-col gap-14">
          {MIGRATION_GUIDES.map((guide) => (
            <section
              key={guideId(guide)}
              id={guideId(guide)}
              className="flex scroll-mt-24 flex-col gap-6"
            >
              <h2 className="text-foreground scroll-mt-24 text-2xl font-semibold">
                Upgrading from v{guide.fromVersion} to v{guide.toVersion}
              </h2>

              <div className="flex flex-col gap-2">
                <p className="text-foreground text-sm font-medium">
                  Breaking changes in this version
                </p>
                <ul className="text-foreground/90 flex list-disc flex-col gap-1.5 pl-5 leading-relaxed">
                  {guide.breakingChanges.map((change, i) => (
                    <li key={i}>{change}</li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-8">
                {guide.steps.map((step, index) => (
                  <div
                    key={index}
                    id={stepId(guide, index)}
                    className="flex scroll-mt-24 flex-col gap-3"
                  >
                    <h3 className="text-foreground text-lg font-semibold">
                      {index + 1}. {step.title}
                    </h3>
                    <p className="text-foreground/90 leading-relaxed">{step.description}</p>
                    {step.code && (
                      <CodeBlock
                        code={step.code.code}
                        language={step.code.language}
                        filename={step.code.filename}
                        highlightLines={step.code.highlightLines}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>

      <aside className="hidden w-56 shrink-0 xl:block">
        <div className="sticky top-24">
          <TableOfContents headings={HEADINGS} />
        </div>
      </aside>
    </div>
  );
}

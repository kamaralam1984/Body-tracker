import { Badge } from "@/components/ui/badge";
import { TableOfContents } from "@/features/docs/components/table-of-contents";
import { formatReleaseDate } from "@/features/docs/lib/docs-format";
import { CHANGELOG } from "@/features/docs/lib/changelog-content";
import type { ChangeKind, TocHeading } from "@/features/docs/types";

const KIND_LABEL: Record<ChangeKind, string> = {
  feature: "Feature",
  improvement: "Improvement",
  fix: "Fix",
  breaking: "Breaking",
  deprecation: "Deprecated",
};

const KIND_VARIANT: Record<ChangeKind, "accent" | "info" | "success" | "danger" | "warning"> = {
  feature: "accent",
  improvement: "info",
  fix: "success",
  breaking: "danger",
  deprecation: "warning",
};

function headingId(version: string): string {
  return `v${version.replace(/\./g, "-")}`;
}

const HEADINGS: TocHeading[] = CHANGELOG.map((entry) => ({
  id: headingId(entry.version),
  text: `v${entry.version}`,
  depth: 2,
}));

export default function ChangelogPage() {
  return (
    <div className="flex gap-12">
      <article className="flex max-w-3xl min-w-0 flex-1 flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Changelog</h1>
          <p className="text-muted-foreground text-lg">
            Every release of{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              @bodytracker/sdk
            </code>
            , newest first. Breaking changes are called out in{" "}
            <Badge variant="danger" className="align-middle">
              Breaking
            </Badge>{" "}
            — see the{" "}
            <a
              href="/docs/migration-guide"
              className="text-accent font-medium underline underline-offset-4"
            >
              Migration Guide
            </a>{" "}
            for step-by-step upgrade instructions.
          </p>
        </div>

        <div className="flex flex-col gap-10">
          {CHANGELOG.map((entry, index) => (
            <section
              key={entry.version}
              id={headingId(entry.version)}
              className="border-border flex scroll-mt-24 flex-col gap-3 border-b pb-10 last:border-0 last:pb-0"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-foreground text-2xl font-semibold">v{entry.version}</h2>
                {index === 0 && <Badge variant="accent">Current</Badge>}
                <span className="text-muted-foreground text-sm">
                  {formatReleaseDate(entry.date)}
                </span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {entry.changes.map((change, changeIndex) => (
                  <li key={changeIndex} className="flex items-start gap-3">
                    <Badge variant={KIND_VARIANT[change.kind]} className="mt-0.5 shrink-0">
                      {KIND_LABEL[change.kind]}
                    </Badge>
                    <span className="text-foreground/90 leading-relaxed">{change.description}</span>
                  </li>
                ))}
              </ul>
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

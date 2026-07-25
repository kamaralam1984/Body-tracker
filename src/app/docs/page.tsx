"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock, DOCS_NAV, SDK_GITHUB_URL, SDK_VERSION } from "@/features/docs";

const QUICK_START_SNIPPET = `import { BodyTracker } from "@bodytracker/sdk";

const tracker = new BodyTracker({ apiKey: "bt_live_51H8x..." });

await tracker.init();

const session = await tracker.startSession({ activity: "walking" });

tracker.on("movementChanged", (event) => {
  console.log("Movement changed:", event);
});
`;

const EASE = [0.16, 1, 0.3, 1] as const;

export default function DocsIntroPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-16">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex flex-col gap-6"
      >
        <span className="border-border bg-surface text-muted-foreground inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
          v{SDK_VERSION} · Latest release
        </span>
        <h1 className="text-foreground max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Real-time body tracking, built for developers.
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
          @bodytracker/sdk brings camera-based movement tracking, activity detection, and session
          analytics to any web app — a few lines of code, no ML expertise required.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg" asChild>
            <Link href="/docs/getting-started">
              Get started
              <ArrowRight />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href={SDK_GITHUB_URL} target="_blank" rel="noreferrer">
              <GitBranch />
              View on GitHub
            </a>
          </Button>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
      >
        <CodeBlock code={QUICK_START_SNIPPET} language="typescript" filename="quick-start.ts" />
      </motion.section>

      <section className="flex flex-col gap-6">
        <h2 className="text-foreground text-xl font-semibold">Explore the docs</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOCS_NAV.filter((section) => section.id !== "introduction").map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 * index, ease: EASE }}
              >
                <Link
                  href={section.items[0].href}
                  className="border-border bg-surface hover:border-accent-300 dark:hover:border-accent-700 group flex h-full flex-col gap-3 rounded-xl border p-5 transition-colors duration-150"
                >
                  <div className="bg-muted flex size-9 items-center justify-center rounded-md">
                    <Icon className="text-muted-foreground size-4" strokeWidth={1.75} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-foreground group-hover:text-accent-600 dark:group-hover:text-accent-400 text-sm font-semibold transition-colors duration-150">
                      {section.title}
                    </p>
                    <ul className="text-muted-foreground flex flex-col gap-0.5 text-xs">
                      {section.items.map((item) => (
                        <li key={item.id}>{item.title}</li>
                      ))}
                    </ul>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

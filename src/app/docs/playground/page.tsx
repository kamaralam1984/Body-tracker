"use client";

import { useMemo, useState } from "react";
import { CodeBlock } from "@/features/docs/components/code-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-extras";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

// `ActivityType` is part of the fictional @bodytracker/sdk's own type
// surface, not this docs feature's `types.ts` contract — defined locally
// here (matching the canonical spec) rather than editing that shared file.
type ActivityType = "standing" | "walking" | "running" | "sitting" | "idle";
type PlaygroundLanguage = "javascript" | "typescript";
type PlaygroundEnvironment = "production" | "sandbox";

const ACTIVITY_TYPES: ActivityType[] = ["standing", "walking", "running", "sitting", "idle"];

const DEFAULTS = {
  activityTypes: ["walking", "running"] as ActivityType[],
  environment: "production" as PlaygroundEnvironment,
  smoothingEnabled: true,
  language: "typescript" as PlaygroundLanguage,
};

function generateCode(config: {
  activityTypes: ActivityType[];
  environment: PlaygroundEnvironment;
  smoothingEnabled: boolean;
  language: PlaygroundLanguage;
}): string {
  const { activityTypes, environment, smoothingEnabled, language } = config;

  const importLine =
    language === "typescript"
      ? `import { BodyTracker, type BodyTrackerConfig } from "@bodytracker/sdk";`
      : `import { BodyTracker } from "@bodytracker/sdk";`;

  const configLines: string[] = [
    `  apiKey: "bt_live_...redacted",`,
    `  environment: "${environment}",`,
  ];

  if (activityTypes.length > 0 && activityTypes.length < ACTIVITY_TYPES.length) {
    configLines.push(`  activityTypes: [${activityTypes.map((a) => `"${a}"`).join(", ")}],`);
  }

  if (smoothingEnabled) {
    configLines.push(`  smoothing: { enabled: true, windowSize: 5 },`);
  } else {
    configLines.push(`  smoothing: { enabled: false },`);
  }

  const configDecl =
    language === "typescript"
      ? `const config: BodyTrackerConfig = {\n${configLines.join("\n")}\n};`
      : `const config = {\n${configLines.join("\n")}\n};`;

  return `${importLine}

${configDecl}

const tracker = new BodyTracker(config);

await tracker.init();
console.log(tracker.getStatus()); // "ready"
`;
}

export default function PlaygroundPage() {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>(DEFAULTS.activityTypes);
  const [environment, setEnvironment] = useState<PlaygroundEnvironment>(DEFAULTS.environment);
  const [smoothingEnabled, setSmoothingEnabled] = useState(DEFAULTS.smoothingEnabled);
  const [language, setLanguage] = useState<PlaygroundLanguage>(DEFAULTS.language);

  const code = useMemo(
    () => generateCode({ activityTypes, environment, smoothingEnabled, language }),
    [activityTypes, environment, smoothingEnabled, language],
  );

  function toggleActivityType(type: ActivityType) {
    setActivityTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  function handleReset() {
    setActivityTypes(DEFAULTS.activityTypes);
    setEnvironment(DEFAULTS.environment);
    setSmoothingEnabled(DEFAULTS.smoothingEnabled);
    setLanguage(DEFAULTS.language);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Playground</h1>
          <Badge variant="warning">Beta</Badge>
        </div>
        <p className="text-muted-foreground max-w-3xl text-lg">
          Configure a{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">BodyTracker</code>{" "}
          instance below and watch the initialization code update live. This is a configuration
          builder, not a live execution sandbox — there&apos;s no real camera or tracker running
          here, only real, correct code generated from your selections that you can copy straight
          into your project.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="border-border bg-surface flex flex-col gap-8 rounded-xl border p-6">
          <div className="flex flex-col gap-3">
            <p className="text-foreground text-sm font-semibold">Activity types</p>
            <p className="text-muted-foreground text-xs">
              Leave all selected to omit <code className="font-mono">activityTypes</code> and track
              every activity.
            </p>
            <div className="flex flex-col gap-2.5">
              {ACTIVITY_TYPES.map((type) => (
                <label key={type} className="text-foreground flex items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={activityTypes.includes(type)}
                    onChange={() => toggleActivityType(type)}
                  />
                  <span className="capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-foreground text-sm font-semibold">Environment</p>
            <ButtonGroup>
              <Button
                type="button"
                size="sm"
                variant={environment === "production" ? "primary" : "outline"}
                onClick={() => setEnvironment("production")}
              >
                Production
              </Button>
              <Button
                type="button"
                size="sm"
                variant={environment === "sandbox" ? "primary" : "outline"}
                onClick={() => setEnvironment("sandbox")}
              >
                Sandbox
              </Button>
            </ButtonGroup>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-foreground text-sm font-semibold">Smoothing</p>
            <label className="text-foreground flex items-center gap-3 text-sm">
              <Switch checked={smoothingEnabled} onCheckedChange={setSmoothingEnabled} />
              {smoothingEnabled ? "Enabled" : "Disabled"}
            </label>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-foreground text-sm font-semibold">Language</p>
            <ButtonGroup>
              <Button
                type="button"
                size="sm"
                variant={language === "javascript" ? "primary" : "outline"}
                onClick={() => setLanguage("javascript")}
              >
                JavaScript
              </Button>
              <Button
                type="button"
                size="sm"
                variant={language === "typescript" ? "primary" : "outline"}
                onClick={() => setLanguage("typescript")}
              >
                TypeScript
              </Button>
            </ButtonGroup>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleReset}
            className="mt-auto"
          >
            Reset to defaults
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-foreground text-sm font-semibold">Generated code</p>
          <CodeBlock
            code={code}
            language={language}
            filename={language === "typescript" ? "tracker.ts" : "tracker.js"}
            showLineNumbers
          />
        </div>
      </div>
    </div>
  );
}

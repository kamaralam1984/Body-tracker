"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-extras";
import { ApiExplorer } from "./api-explorer";
import { RedocViewer } from "./redoc-viewer";

const DOWNLOADS = [
  { label: "OpenAPI JSON", href: "/api/v1/openapi.json" },
  { label: "OpenAPI YAML", href: "/api/v1/openapi.yaml" },
  { label: "Postman Collection", href: "/api/v1/postman-collection.json" },
  { label: "Insomnia Collection", href: "/api/v1/insomnia-collection.json" },
];

type Tab = "explore" | "browse";

export function ApiReferenceTabs() {
  const [tab, setTab] = useState<Tab>("explore");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ButtonGroup>
          <Button
            type="button"
            size="sm"
            variant={tab === "explore" ? "primary" : "outline"}
            onClick={() => setTab("explore")}
          >
            Try it out
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "browse" ? "primary" : "outline"}
            onClick={() => setTab("browse")}
          >
            Browse docs
          </Button>
        </ButtonGroup>

        <div className="flex flex-wrap items-center gap-2">
          {DOWNLOADS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              download
              className="border-border text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
            >
              <Download className="size-3.5" />
              {item.label}
            </a>
          ))}
        </div>
      </div>

      {tab === "explore" ? <ApiExplorer /> : <RedocViewer />}
    </div>
  );
}

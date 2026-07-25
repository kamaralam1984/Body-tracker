"use client";

/**
 * The structured API-reference primitive — one card per method/hook/event,
 * every doc getting the same shape (description, signature, parameters,
 * returns, throws, examples, notes) the way Stripe/Vercel/Supabase docs
 * present their reference sections. Built once, reused by API Reference,
 * Hooks, and Events pages alike.
 *
 * <ApiCard doc={methodDoc} />
 */

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";
import { CodeTabs } from "./code-tabs";
import type { ApiMethodDoc, ApiParam, CodeExample, HookDoc } from "../types";

const KIND_LABEL: Record<ApiMethodDoc["kind"], string> = {
  constructor: "Constructor",
  method: "Method",
  property: "Property",
  static: "Static method",
};

export function ParamsTable({ params, className }: { params: ApiParam[]; className?: string }) {
  if (params.length === 0) return null;
  return (
    <div className={cn("border-border overflow-hidden rounded-lg border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Parameter</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {params.map((param) => (
            <TableRow key={param.name}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <code className="text-foreground font-mono text-xs font-medium">
                    {param.name}
                  </code>
                  {param.required ? (
                    <Badge variant="danger" className="text-[10px]">
                      Required
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Optional
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <code className="text-accent-600 dark:text-accent-400 font-mono text-xs">
                  {param.type}
                </code>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {param.description}
                {param.defaultValue && (
                  <span className="text-muted-foreground">
                    {" "}
                    Default: <code className="font-mono text-xs">{param.defaultValue}</code>
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
      {children}
    </h4>
  );
}

export function ApiCard({ doc, className }: { doc: ApiMethodDoc; className?: string }) {
  return (
    <div id={doc.id} className={cn("border-border scroll-mt-24 rounded-xl border p-6", className)}>
      <div className="flex flex-wrap items-center gap-2.5">
        <h3 className="text-foreground font-mono text-lg font-semibold">{doc.name}</h3>
        <Badge variant="outline">{KIND_LABEL[doc.kind]}</Badge>
        <span className="text-muted-foreground text-xs">since v{doc.since}</span>
      </div>

      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{doc.description}</p>

      <div className="mt-4">
        <CodeBlock code={doc.signature} language="typescript" showLineNumbers={false} />
      </div>

      {doc.params.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          <SectionHeading>Parameters</SectionHeading>
          <ParamsTable params={doc.params} />
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <SectionHeading>Returns</SectionHeading>
        <p className="text-sm">
          <code className="text-accent-600 dark:text-accent-400 font-mono text-xs">
            {doc.returns.type}
          </code>
          <span className="text-muted-foreground"> — {doc.returns.description}</span>
        </p>
      </div>

      {doc.throws && doc.throws.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          <SectionHeading>Throws</SectionHeading>
          <ul className="flex flex-col gap-1.5">
            {doc.throws.map((t) => (
              <li key={t.type} className="flex items-start gap-2 text-sm">
                <AlertTriangle
                  className="text-warning-500 mt-0.5 size-3.5 shrink-0"
                  strokeWidth={2}
                />
                <span>
                  <code className="text-foreground font-mono text-xs">{t.type}</code>
                  <span className="text-muted-foreground"> — {t.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {doc.examples.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          <SectionHeading>Example</SectionHeading>
          <CodeTabs examples={doc.examples} />
        </div>
      )}

      {doc.notes && doc.notes.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          <SectionHeading>Notes</SectionHeading>
          <ul className="text-muted-foreground list-disc pl-5 text-sm leading-relaxed">
            {doc.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function HookCard({ doc, className }: { doc: HookDoc; className?: string }) {
  return (
    <div id={doc.id} className={cn("border-border scroll-mt-24 rounded-xl border p-6", className)}>
      <div className="flex flex-wrap items-center gap-2.5">
        <h3 className="text-foreground font-mono text-lg font-semibold">{doc.name}</h3>
        <Badge variant="outline">Hook</Badge>
        <span className="text-muted-foreground text-xs">since v{doc.since}</span>
      </div>

      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{doc.description}</p>

      <div className="mt-4">
        <CodeBlock code={doc.signature} language="typescript" showLineNumbers={false} />
      </div>

      {doc.params.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          <SectionHeading>Parameters</SectionHeading>
          <ParamsTable params={doc.params} />
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <SectionHeading>Returns</SectionHeading>
        <p className="text-sm">
          <code className="text-accent-600 dark:text-accent-400 font-mono text-xs">
            {doc.returns.type}
          </code>
          <span className="text-muted-foreground"> — {doc.returns.description}</span>
        </p>
        {doc.returns.fields && doc.returns.fields.length > 0 && (
          <ParamsTable params={doc.returns.fields} />
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <SectionHeading>Example</SectionHeading>
        <CodeBlock
          code={doc.example.code}
          language={doc.example.language}
          filename={doc.example.filename}
        />
      </div>
    </div>
  );
}

export type { CodeExample };

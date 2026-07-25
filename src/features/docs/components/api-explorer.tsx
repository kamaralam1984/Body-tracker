"use client";

/**
 * A real, interactive REST API explorer — unlike the SDK "Playground" (a
 * config → code generator with no live execution), this hits the actual
 * running `/api/v1/*` Route Handlers in this browser via `fetch`/`EventSource`
 * and renders the real response. The endpoint catalog is fetched live from
 * `/api/v1/openapi.json`, so it can never drift from the real API surface.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, Play, Radio, Search, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

interface OpenApiParam {
  name: string;
  in: "path" | "query";
  required?: boolean;
  schema?: { type?: string; enum?: string[] };
}

interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  parameters?: OpenApiParam[];
  requestBody?: { content?: Record<string, unknown> };
  responses?: Record<string, { content?: Record<string, unknown> }>;
}

type Method = "get" | "post" | "patch" | "delete" | "put";
type OpenApiPathItem = Partial<Record<Method, OpenApiOperation>>;

interface OpenApiDoc {
  paths: Record<string, OpenApiPathItem>;
}

interface EndpointEntry {
  path: string;
  method: Method;
  operation: OpenApiOperation;
}

const METHODS: Method[] = ["get", "post", "patch", "delete", "put"];

const METHOD_BADGE_CLASS: Record<Method, string> = {
  get: "bg-info-bg text-info-600 dark:text-info-500",
  post: "bg-success-bg text-success-600 dark:text-success-500",
  patch: "bg-warning-bg text-warning-600 dark:text-warning-500",
  put: "bg-warning-bg text-warning-600 dark:text-warning-500",
  delete: "bg-danger-bg text-danger-600 dark:text-danger-500",
};

const SEED_ACCOUNTS = [
  { label: "Owner", email: "owner@apex-performance.dev", password: "OwnerPass123!" },
  { label: "Admin", email: "admin@apex-performance.dev", password: "AdminPass123!" },
  { label: "Member", email: "member@apex-performance.dev", password: "MemberPass123!" },
];

const PARAM_HINTS: Record<string, string> = {
  id: "sess_seed_0",
  sessionId: "sess_seed_0",
  userId: "user_member",
};

interface ResponseState {
  status: number;
  ok: boolean;
  durationMs: number;
  headers: Record<string, string>;
  body: string;
  downloadUrl?: string;
  downloadName?: string;
}

function extractFilename(disposition: string | null): string {
  if (!disposition) return "download";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  return match?.[1] ?? "download";
}

export function ApiExplorer() {
  const [doc, setDoc] = useState<OpenApiDoc | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<EndpointEntry | null>(null);
  const [token, setToken] = useState("");
  const [authLoading, setAuthLoading] = useState<string | null>(null);
  const [pathValues, setPathValues] = useState<Record<string, string>>({});
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState("");
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<ResponseState | null>(null);
  const [streamLines, setStreamLines] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch("/api/v1/openapi.json")
      .then((r) => r.json())
      .then((d: OpenApiDoc) => setDoc(d))
      .catch(() =>
        setLoadError("Could not load the live OpenAPI document from /api/v1/openapi.json."),
      );
  }, []);

  useEffect(() => () => eventSourceRef.current?.close(), []);

  const endpoints = useMemo<EndpointEntry[]>(() => {
    if (!doc) return [];
    const list: EndpointEntry[] = [];
    for (const [path, item] of Object.entries(doc.paths)) {
      for (const method of METHODS) {
        const operation = item[method];
        if (operation) list.push({ path, method, operation });
      }
    }
    return list;
  }, [doc]);

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? endpoints.filter(
          (e) =>
            e.path.toLowerCase().includes(q) ||
            (e.operation.summary ?? "").toLowerCase().includes(q) ||
            e.method.includes(q),
        )
      : endpoints;

    const byTag = new Map<string, EndpointEntry[]>();
    for (const entry of filtered) {
      const tag = entry.operation.tags?.[0] ?? "Other";
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag)!.push(entry);
    }
    return byTag;
  }, [endpoints, filter]);

  const isSse = !!selected?.operation.responses?.["200"]?.content?.["text/event-stream"];
  const isDownload = selected?.path.endsWith("/download") ?? false;

  function selectEndpoint(entry: EndpointEntry) {
    stopStream();
    setSelected(entry);
    setResponse(null);
    const nextPath: Record<string, string> = {};
    const nextQuery: Record<string, string> = {};
    for (const param of entry.operation.parameters ?? []) {
      if (param.in === "path") nextPath[param.name] = PARAM_HINTS[param.name] ?? "";
      if (param.in === "query") nextQuery[param.name] = "";
    }
    setPathValues(nextPath);
    setQueryValues(nextQuery);
    setBodyText(entry.operation.requestBody ? "{\n  \n}" : "");
  }

  async function quickLogin(account: (typeof SEED_ACCOUNTS)[number]) {
    setAuthLoading(account.label);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: account.email, password: account.password }),
      });
      const json = await res.json();
      if (res.ok) setToken(json.data.accessToken);
    } finally {
      setAuthLoading(null);
    }
  }

  function buildUrl() {
    if (!selected) return "";
    let url = selected.path;
    for (const [key, value] of Object.entries(pathValues)) {
      url = url.replace(`{${key}}`, encodeURIComponent(value));
    }
    return url;
  }

  function stopStream() {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setStreaming(false);
  }

  function startStream() {
    if (!selected) return;
    const url = buildUrl();
    const qs = token ? `?access_token=${encodeURIComponent(token)}` : "";
    const es = new EventSource(`/api/v1${url}${qs}`);
    eventSourceRef.current = es;
    setStreaming(true);
    setStreamLines([`→ connecting to /api/v1${url}...`]);
    es.onmessage = (e) => setStreamLines((prev) => [...prev.slice(-49), `data: ${e.data}`]);
    es.addEventListener("ping", () => setStreamLines((prev) => [...prev.slice(-49), "♥ ping"]));
    es.addEventListener("closed", () => {
      setStreamLines((prev) => [...prev, "— server closed the stream —"]);
      stopStream();
    });
    es.onerror = () => {
      setStreamLines((prev) => [...prev, "— connection closed —"]);
      stopStream();
    };
  }

  async function sendRequest() {
    if (!selected) return;
    setSending(true);
    setResponse(null);
    try {
      const url = buildUrl();
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(queryValues)) {
        if (value) query.set(key, value);
      }
      const qs = query.toString();
      const fullUrl = `/api/v1${url}${qs ? `?${qs}` : ""}`;

      const headers: Record<string, string> = {};
      if (token)
        headers.Authorization = token.startsWith("btk_") ? `ApiKey ${token}` : `Bearer ${token}`;
      let body: string | undefined;
      if (selected.operation.requestBody && bodyText.trim()) {
        headers["Content-Type"] = "application/json";
        body = bodyText;
      }

      const start = performance.now();
      const res = await fetch(fullUrl, { method: selected.method.toUpperCase(), headers, body });
      const durationMs = Math.round(performance.now() - start);

      const headerEntries: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headerEntries[key] = value;
      });

      if (isDownload) {
        const blob = await res.blob();
        const downloadUrl = res.ok ? URL.createObjectURL(blob) : undefined;
        setResponse({
          status: res.status,
          ok: res.ok,
          durationMs,
          headers: headerEntries,
          body: res.ok ? "" : await blob.text(),
          downloadUrl,
          downloadName: extractFilename(res.headers.get("content-disposition")),
        });
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";
      const text = contentType.includes("application/json")
        ? JSON.stringify(await res.json(), null, 2)
        : await res.text();

      setResponse({
        status: res.status,
        ok: res.ok,
        durationMs,
        headers: headerEntries,
        body: text,
      });
    } catch (error) {
      setResponse({
        status: 0,
        ok: false,
        durationMs: 0,
        headers: {},
        body: error instanceof Error ? error.message : "Request failed",
      });
    } finally {
      setSending(false);
    }
  }

  if (loadError) {
    return <p className="text-danger-600 dark:text-danger-500 text-sm">{loadError}</p>;
  }

  if (!doc) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading the live API catalog…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      {/* Endpoint catalog */}
      <div className="border-border bg-surface flex max-h-[70vh] flex-col gap-3 overflow-hidden rounded-xl border p-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter endpoints…"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          {[...grouped.entries()].map(([tag, items]) => (
            <div key={tag} className="flex flex-col gap-1">
              <p className="text-muted-foreground px-1 text-[11px] font-semibold tracking-wide uppercase">
                {tag}
              </p>
              {items.map((entry) => {
                const isActive = selected?.path === entry.path && selected.method === entry.method;
                return (
                  <button
                    key={`${entry.method}-${entry.path}`}
                    type="button"
                    onClick={() => selectEndpoint(entry)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-150",
                      isActive
                        ? "bg-accent-500/10 text-accent-700 dark:text-accent-300"
                        : "hover:bg-muted text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "w-14 shrink-0 rounded px-1.5 py-0.5 text-center font-mono text-[10px] font-bold uppercase",
                        METHOD_BADGE_CLASS[entry.method],
                      )}
                    >
                      {entry.method}
                    </span>
                    <span className="truncate font-mono">{entry.path}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Request builder + response */}
      <div className="flex flex-col gap-5">
        <div className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-5">
          <p className="text-foreground text-sm font-semibold">Authorization</p>
          <p className="text-muted-foreground text-xs">
            Sign in as a seed account to get a real access token, or paste your own Bearer token /
            API key.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {SEED_ACCOUNTS.map((account) => (
              <Button
                key={account.label}
                type="button"
                size="sm"
                variant="outline"
                disabled={authLoading !== null}
                onClick={() => quickLogin(account)}
              >
                {authLoading === account.label ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                Sign in as {account.label}
              </Button>
            ))}
          </div>
          <Input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Bearer access token or btk_live_… API key"
            className="font-mono text-xs"
          />
        </div>

        {!selected ? (
          <div className="border-border text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
            Pick an endpoint on the left to build a real request against it.
          </div>
        ) : (
          <div className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase",
                  METHOD_BADGE_CLASS[selected.method],
                )}
              >
                {selected.method}
              </span>
              <code className="text-foreground text-sm font-medium">/api/v1{buildUrl()}</code>
              {isSse && <Badge variant="info">Server-Sent Events</Badge>}
            </div>
            {selected.operation.summary && (
              <p className="text-muted-foreground text-sm">{selected.operation.summary}</p>
            )}

            {(selected.operation.parameters ?? []).length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Parameters
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(selected.operation.parameters ?? []).map((param) => (
                    <label key={`${param.in}-${param.name}`} className="flex flex-col gap-1">
                      <span className="text-foreground font-mono text-xs">
                        {param.name}
                        {param.required && <span className="text-danger-500"> *</span>}
                        <span className="text-muted-foreground"> ({param.in})</span>
                      </span>
                      <Input
                        value={
                          param.in === "path"
                            ? (pathValues[param.name] ?? "")
                            : (queryValues[param.name] ?? "")
                        }
                        onChange={(e) =>
                          param.in === "path"
                            ? setPathValues((prev) => ({ ...prev, [param.name]: e.target.value }))
                            : setQueryValues((prev) => ({ ...prev, [param.name]: e.target.value }))
                        }
                        className="h-8 text-xs"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {selected.operation.requestBody && (
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  JSON body
                </p>
                <Textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={6}
                  className="font-mono text-xs"
                />
              </div>
            )}

            {isSse ? (
              <div className="flex items-center gap-2">
                {!streaming ? (
                  <Button type="button" onClick={startStream} disabled={!pathValues.sessionId}>
                    <Radio className="size-3.5" />
                    Open live stream
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={stopStream}>
                    <Square className="size-3.5" />
                    Stop stream
                  </Button>
                )}
              </div>
            ) : (
              <Button type="button" onClick={sendRequest} disabled={sending} className="w-fit">
                {sending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5" />
                )}
                Send request
              </Button>
            )}

            {isSse && streamLines.length > 0 && (
              <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3 font-mono text-xs text-neutral-300">
                <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                  {streamLines.map((line, i) => (
                    <div key={i} className="break-all">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {response && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant={response.ok ? "success" : "danger"}>
                    {response.status || "network error"}
                  </Badge>
                  <span className="text-muted-foreground text-xs">{response.durationMs}ms</span>
                </div>
                {response.downloadUrl && (
                  <a
                    href={response.downloadUrl}
                    download={response.downloadName}
                    className="text-accent-600 dark:text-accent-400 flex w-fit items-center gap-1.5 text-sm font-medium hover:underline"
                  >
                    <Download className="size-3.5" />
                    Download {response.downloadName}
                  </a>
                )}
                {response.body && (
                  <CodeBlock code={response.body} language="json" showLineNumbers />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

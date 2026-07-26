import { Badge } from "@/components/ui/badge";
import { ApiReferenceTabs } from "@/features/docs";

export default function ApiExplorerPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">API Explorer</h1>
          <Badge variant="success">Live</Badge>
        </div>
        <p className="text-muted-foreground max-w-3xl text-lg">
          <strong>Try it out</strong> is a real request console for the Body Tracker REST API —
          every request hits the actual{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">/api/v1</code>{" "}
          endpoints running in this deployment and shows the real response.{" "}
          <strong>Browse docs</strong> is a read-only Redoc rendering of the same specification for
          reference reading. Both, plus the downloads on the right, are generated live from{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
            /api/v1/openapi.json
          </code>
          , which is itself derived from the real Zod validators each endpoint uses — so none of
          this can drift from the actual API.
        </p>
      </div>
      <ApiReferenceTabs />
    </div>
  );
}

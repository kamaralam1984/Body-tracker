import { Badge } from "@/components/ui/badge";
import { ApiExplorer } from "@/features/docs";

export default function ApiExplorerPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">API Explorer</h1>
          <Badge variant="success">Live</Badge>
        </div>
        <p className="text-muted-foreground max-w-3xl text-lg">
          A real request console for the Body Tracker REST API — every request here hits the actual{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">/api/v1</code>{" "}
          endpoints running in this deployment and shows the real response. The endpoint catalog is
          read live from{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
            /api/v1/openapi.json
          </code>
          .
        </p>
      </div>
      <ApiExplorer />
    </div>
  );
}

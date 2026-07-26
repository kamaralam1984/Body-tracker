/**
 * Real OpenTelemetry instrumentation — HTTP + Postgres spans (Prisma runs
 * over `pg` via `@prisma/adapter-pg`, see `src/server/db/prisma.ts`, so
 * instrumenting `pg` covers real query spans without a Prisma-specific
 * package). Deliberately NOT the `@opentelemetry/auto-instrumentations-node`
 * meta-package — that bundles dozens of per-library instrumentations
 * (cloud SDKs, message queues, etc.) this app doesn't use, which is both
 * dishonest ("instrumented" things that never run) and real dependency
 * weight for no benefit.
 *
 * Entirely opt-in: does nothing unless `OTEL_EXPORTER_OTLP_ENDPOINT` is
 * set, so a deployment that hasn't stood up a collector (Grafana Tempo,
 * Jaeger, etc. — see observability/README.md) sees zero behavior change.
 */
export async function startOpenTelemetry(): Promise<void> {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return;

  const [
    { NodeSDK },
    { OTLPTraceExporter },
    { HttpInstrumentation },
    { PgInstrumentation },
    { resourceFromAttributes },
    semconv,
  ] = await Promise.all([
    import("@opentelemetry/sdk-node"),
    import("@opentelemetry/exporter-trace-otlp-http"),
    import("@opentelemetry/instrumentation-http"),
    import("@opentelemetry/instrumentation-pg"),
    import("@opentelemetry/resources"),
    import("@opentelemetry/semantic-conventions"),
  ]);

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [semconv.ATTR_SERVICE_NAME]: "body-tracker-api",
    }),
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    instrumentations: [new HttpInstrumentation(), new PgInstrumentation()],
  });

  sdk.start();

  process.on("SIGTERM", () => {
    sdk.shutdown().catch(() => undefined);
  });
}

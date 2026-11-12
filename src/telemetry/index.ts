// OpenTelemetry tracing (architecture rule E-5).
// Configured only by environment variables: off unless OTEL_EXPORTER_OTLP_ENDPOINT
// is set. Request and response bodies, headers, and SQL parameters are never
// recorded, because they carry personal data and credentials.
import { register } from "node:module";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchSpanProcessor, type ReadableSpan, type SpanExporter, type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import type { ExportResult } from "@opentelemetry/core";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

/**
 * Attributes the instrumentations add that identify a person or carry request
 * data: client IPs, user agents, and query strings. Removed before export (E-5).
 */
export const REDACTED_ATTRIBUTES = [
  "client.address", "client.port", "network.peer.address", "network.peer.port",
  "user_agent.original", "http.user_agent", "http.client_ip", "net.peer.ip", "net.peer.port",
  "url.query", "url.full", "http.url", "http.target",
] as const;

/** Wraps an exporter so spans leave the process without REDACTED_ATTRIBUTES. */
export class RedactingExporter implements SpanExporter {
  constructor(private readonly inner: SpanExporter) {}

  export(spans: ReadableSpan[], done: (result: ExportResult) => void): void {
    const clean = spans.map((span) => {
      const attributes = { ...span.attributes };
      for (const key of REDACTED_ATTRIBUTES) delete attributes[key];
      return Object.create(span, { attributes: { value: attributes } }) as ReadableSpan;
    });
    this.inner.export(clean, done);
  }

  shutdown(): Promise<void> {
    return this.inner.shutdown();
  }

  forceFlush(): Promise<void> {
    return this.inner.forceFlush?.() ?? Promise.resolve();
  }
}

export type Telemetry = { flush(): Promise<void>; shutdown(): Promise<void> };

/** Instrumentation with every option that could record personal data turned off. */
export function instrumentations() {
  return [
    new HttpInstrumentation({
      headersToSpanAttributes: { client: { requestHeaders: [], responseHeaders: [] },
                                 server: { requestHeaders: [], responseHeaders: [] } },
      ignoreIncomingRequestHook: (req) => req.url === "/healthz",
    }),
    new PgInstrumentation({
      enhancedDatabaseReporting: false,   // true would record query parameters (emails, password hashes)
      requireParentSpan: true,
    }),
  ];
}

/**
 * Start tracing if the environment asks for it. Call before importing anything
 * that loads `pg` or `http`, so the instrumentation can patch them.
 * `exporter` is for tests; production uses OTLP over HTTP from OTEL_* variables.
 */
export function startTelemetry(env = process.env, exporter?: SpanExporter): Telemetry | null {
  if (!exporter && !env.OTEL_EXPORTER_OTLP_ENDPOINT) return null;
  if (env.OTEL_LOG_LEVEL === "debug") diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  // Tally is ESM. Patching works for `import`ed packages only with this loader hook,
  // registered before the app imports them (src/server.ts imports the app afterwards).
  register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);
  const processor: SpanProcessor = new BatchSpanProcessor(new RedactingExporter(exporter ?? new OTLPTraceExporter()));
  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      "service.name": env.OTEL_SERVICE_NAME ?? "tally-api",
      "deployment.environment.name": env.TALLY_ENV ?? "dev",
    }),
    spanProcessors: [processor],
  });
  provider.register();
  const unregister = registerInstrumentations({ instrumentations: instrumentations() });
  return {
    async flush() {
      await provider.forceFlush();
    },
    async shutdown() {
      unregister();
      await provider.shutdown();
    },
  };
}

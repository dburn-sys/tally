import { describe, it, expect, afterAll } from "vitest";
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace-base";
import { startTelemetry } from "../src/telemetry/index.js";

// Start tracing before the app (and pg) load, exactly as src/server.ts does.
const exporter = new InMemorySpanExporter();
const telemetry = startTelemetry({}, exporter)!;
await import("./fixtures/auth.js");   // sets a random TALLY_SIGNING_KEY
const { buildApp } = await import("../src/app.js");
const { pool } = await import("../src/db.js");
const { adminPool } = await import("../scripts/admin-db.js");
const { createCompany, createUser } = await import("../src/auth/users.js");
const { trace } = await import("@opentelemetry/api");

const app = buildApp();
afterAll(async () => { await app.close(); await pool.end(); await adminPool.end(); await telemetry.shutdown(); });

describe("telemetry (E-5)", () => {
  it("is off unless OTEL_EXPORTER_OTLP_ENDPOINT is set", () => {
    expect(startTelemetry({})).toBeNull();
  });

  it("records database spans, but never query parameters, emails, or passwords", async () => {
    const company = await createCompany("Telemetry test");
    const email = `otel-${Date.now()}@example.com`;
    const password = "telemetry-secret-passphrase";
    await createUser(company, email, password, "employee");
    await trace.getTracer("test").startActiveSpan("request", async (span) => {
      const res = await app.inject({ method: "POST", url: "/login", payload: { email, password } });
      expect(res.statusCode, res.body).toBe(200);
      span.end();
    });
    await telemetry.flush();
    const spans = exporter.getFinishedSpans();
    const dbSpans = spans.filter((s) => s.attributes["db.system"] === "postgresql" ||
      s.attributes["db.system.name"] === "postgresql");
    expect(dbSpans.length).toBeGreaterThan(0);
    const everything = JSON.stringify(spans.map((s) => ({ name: s.name, attributes: s.attributes, events: s.events })));
    expect(everything).not.toContain(email);
    expect(everything).not.toContain(password);
    expect(everything).not.toMatch(/scrypt|\$[0-9a-f]{32}/);
  });
});

describe("telemetry over real HTTP (E-5)", () => {
  it("never exports the caller's IP address, user agent, or query string", async () => {
    const server = buildApp();
    server.get("/healthz-probe", async () => ({ ok: true }));
    await server.listen({ port: 0, host: "127.0.0.1" });
    const { port } = server.server.address() as { port: number };
    try {
      await fetch(`http://127.0.0.1:${port}/healthz-probe?email=someone%40example.com`, {
        headers: { "user-agent": "Mozilla/5.0 (TallyTest; private-agent-string)", "x-forwarded-for": "203.0.113.77" },
      });
    } finally {
      await server.close();
    }
    await telemetry.flush();
    const httpSpans = exporter.getFinishedSpans().filter((s) => s.attributes["http.request.method"] || s.attributes["http.method"]);
    expect(httpSpans.length).toBeGreaterThan(0);
    const everything = JSON.stringify(httpSpans.map((s) => s.attributes));
    for (const leaked of ["203.0.113.77", "private-agent-string", "someone%40example.com", "someone@example.com"]) {
      expect(everything).not.toContain(leaked);
    }
    expect(everything).toContain("/healthz-probe");   // the route itself is still useful
  });
});

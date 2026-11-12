import { startTelemetry } from "./telemetry/index.js";

// Telemetry first, so its instrumentation can patch http and pg before they load.
const telemetry = startTelemetry();
const { buildApp } = await import("./app.js");

const app = buildApp();
app.get("/healthz", async () => ({ ok: true }));
app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" }).catch((err) => {
  console.error(err);
  process.exit(1);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, async () => {
    await app.close();
    await telemetry?.shutdown();
    process.exit(0);
  });
}

# Section map

Which architecture sections a change touches. Read by gantry:conformance and by
Gantry's G-ARCH commit check.

| Section | Touched when the change includes |
| --- | --- |
| A | src/contracts/**, src/app.ts, web/src/api.ts |
| B | migrations/**, src/db.ts, scripts/migrate.ts, src/*/service.ts |
| C | src/auth/**, src/webhooks/**, src/app.ts |
| D | src/ai/** |
| E | infra/**, Dockerfile*, docker-compose*.yml, .github/**, src/telemetry/** |

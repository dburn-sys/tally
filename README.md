# Tally (companion repo)

The practice app from *Gantry: Building an Agent Harness for Claude Code*: an expense and
reimbursement API that grows chapter by chapter.

Each chapter's checkpoint is a git tag (`ch01`, `ch02`, ...). To pick up from a chapter:

```bash
git checkout ch07
```

Requirements: Node 22+, Docker (for Postgres), and Python 3.10+ from Chapter 9 onward.

```bash
npm install
docker compose up -d
cp .env.example .env   # optional; the defaults match docker compose
npm run migrate
npm test
```

From Chapter 14, Tally uses two database connections (see
`.gantry/decisions/0001-tenancy-rls.md`):

- `MIGRATION_DATABASE_URL` connects as the table owner. Only `npm run migrate` and test
  setup use it.
- `DATABASE_URL` connects as `tally_app`, a role that owns no tables, so row-level
  security always applies. `npm run migrate` creates its login password from
  `TALLY_APP_PASSWORD` (default `tally_app`, for local development only).

## Gantry (from Chapter 22)

`.claude/settings.json` points at the Gantry marketplace and enables the plugin,
so Claude Code offers to install it when you trust this folder. Replace
`your-account/gantry` with where your copy of the gantry repo lives. Then run
`/gantry:doctor` once; it should end with "installed and enforcing".

## The approver dashboard (from Chapter 18)

`web/` is a separate React app with its own dependencies and tests:

```bash
cd web
npm install
npm test          # component tests, no API needed
npm run dev       # http://localhost:5173, with /api proxied to the API on port 3000
```

## Deploying (from Chapter 19)

`infra/` is Terraform for Azure (see `infra/README.md`). Before the first build:

```bash
./scripts/pin-images.sh      # pins the Dockerfile's base images by digest (rule E-1)
```

Telemetry is off unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set.

## Notes on the chapters

- **Chapter 15.** The book's bug (self-approval through API keys) comes from a
  second code path that builds the current user differently. In this repo the
  two paths already shared one lookup, so the bug doesn't reproduce. The `ch15`
  tag still adds the regression tests from the chapter
  (`test/approvals.apikey.test.ts`) and the fix's shape, `src/auth/context.ts`,
  the single place that builds the current user.
- **Chapter 19.** The Dockerfile's base images aren't pinned by digest yet, because
  the companion was built without registry access. That's the one open item in
  Section E: run `scripts/pin-images.sh`, then `/gantry:conformance`. Until then,
  Gantry's G-ARCH gate refuses commits that touch Section E, which is the gate doing
  its job.

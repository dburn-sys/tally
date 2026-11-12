# Tally

## What this is
Tally is an expense tracking API for small companies. Employees record
expenses; later, managers approve them and finance pays them out.

## Commands
- Install: `npm install`
- Start Postgres: `docker compose up -d`
- Run migrations: `npm run migrate`
- Dev server: `npm run dev`
- Tests: `npm test`

## Layout
- `src/app.ts` builds the Fastify app; `src/server.ts` starts it.
- `src/db.ts` holds the Postgres pool.
- `migrations/` holds numbered SQL files, applied in order by `scripts/migrate.ts`.
- `test/` holds Vitest tests that call the app through `app.inject`.

## House rules
- Never add a dependency without asking first and explaining why the
  standard library isn't enough.
- Never delete, skip, or weaken a test to make the suite pass. If a
  test is wrong, stop and say so.
- Run `npm test` before saying a task is done, and show the summary line.
- Every new endpoint needs a test for at least one failure case.
- Database changes go in a new numbered file in `migrations/`. Never
  edit an existing migration.
- Don't commit. The developer commits.
- If a check can't run (database down, tool missing, command times
  out), stop and tell me what failed. Never change tests, mocks, or
  config to get around a check that couldn't run.

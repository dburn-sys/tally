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

## Hard rules
- MUST NOT add a dependency without asking first and explaining why
  existing code and the standard library aren't enough. Every
  dependency is code we now maintain and patch.
- MUST NOT delete, skip, weaken, or change the expected value of a
  test to make the suite pass. If a test is wrong, stop and say why.
  A test changed to match the code proves nothing.
- MUST run `npm test` after the last code change and quote the
  summary line before reporting a task done. "It should pass" is
  not a result.
- MUST add, for every new endpoint, at least one test that sends
  invalid input or a missing resource and checks the error status.
- MUST put database changes in a new numbered file in `migrations/`.
  MUST NOT edit an existing migration, even to fix a typo. Databases
  that already ran it won't run it again.
- MUST NOT commit. The user commits.
- If a check can't run (database down, tool missing, timeout), MUST
  stop and report the error in one line. MUST NOT change code, tests,
  mocks, or config to get around it.

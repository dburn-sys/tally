# Plan: Company isolation

### T-1: Companies, company_id, policies, app role (MVP)
- Files: migrations/007_company_isolation.sql, test/tenancy.test.ts
- Change: companies table; company_id on users, api_keys, expenses, expense_events, backfilled to a default company; RLS enabled and forced with one policy per table; tally_app role with table privileges only
- Verify: tests "AC-6", "AC-7" and "AC-8" pass
- Covers: AC-6, AC-7, AC-8
- Depends on: none

### T-2: Authenticate without a company, then scope the request (MVP)
- Files: migrations/007_company_isolation.sql, src/db.ts, src/auth/users.ts, src/app.ts, src/approvals/service.ts
- Change: SECURITY DEFINER lookups for login, session, and API key; withCompany() sets tally.company_id per transaction; every handler runs inside it
- Verify: tests "AC-1" to "AC-5" pass, and the existing suites still pass
- Covers: AC-1, AC-2, AC-3, AC-4, AC-5
- Depends on: T-1

### T-3: Separate migration and app connections
- Files: scripts/migrate.ts, test/fixtures/db.ts, .env.example, README.md
- Change: migrations and test setup use MIGRATION_DATABASE_URL (owner); the app uses DATABASE_URL (tally_app)
- Verify: npm run migrate then npm test, both green
- Covers: AC-6
- Depends on: T-1

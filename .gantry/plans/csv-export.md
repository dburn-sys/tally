# Plan: CSV export of approved expenses

### T-1: Company time zone (MVP)
- Files: migrations/009_company_timezone.sql, test/export.test.ts
- Change: companies get a time_zone column, default 'UTC', checked against Postgres's known zones
- Verify: test "AC-2" can set a company's time zone
- Covers: AC-2
- Depends on: none
- Author: backend
- Tier: helper

### T-2: Build the CSV (MVP)
- Files: src/export/csv.ts, test/export.test.ts
- Change: query last month's approved and paid expenses with their approver, and format them as RFC 4180 CSV in the import's column order
- Verify: tests "AC-2" to "AC-7" pass
- Covers: AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- Depends on: T-1
- Author: backend
- Tier: engineer

### T-3: Route
- Files: src/app.ts, test/export.test.ts
- Change: GET /exports/expenses.csv for finance only
- Verify: test "AC-1" passes
- Covers: AC-1
- Depends on: T-2
- Author: backend
- Tier: helper

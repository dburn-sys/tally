# Spike: tenancy-rls
Question: Can Postgres row-level security keep each company's expenses separate
without changing every query?

## Tried
Two companies, one expenses table with a company_id column, a policy filtering on
current_setting('tally.company_id'), and a test reading as company A with a
WHERE clause that deliberately omits the company filter.

## Learned
- RLS works with no query changes. A policy on expenses filters by
  current_setting('tally.company_id'), set per request.
- The app's database user must NOT own the tables, or RLS is bypassed silently.
  The first version had this bug and the isolation test still passed because
  the test also connected as the owner. Fixed by adding a separate app role.
- Migrations stay single-path: one schema, one set of files.

## Recommendation
Use RLS. Record the owner-bypass trap as a hard rule.

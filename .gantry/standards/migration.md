# Tally additions to the migration standard

Rules from ADR-0001 (`.gantry/decisions/0001-tenancy-rls.md`). They apply on top
of Gantry's `standards/migration.md`.

### MIG-1: Every company-owned table has company_id and a policy, in the migration that creates it
company_id is NOT NULL, references companies, and defaults to
`nullif(current_setting('tally.company_id', true), '')::uuid`. The same migration
creates a `company_isolation` policy with both USING and WITH CHECK on company_id.
References to other company-owned rows use a composite foreign key on
(id, company_id), so a row can't point into another company.
Violation:
    CREATE TABLE payouts (id uuid PRIMARY KEY, expense_id uuid REFERENCES expenses(id), ...);
Not a violation: lookup tables shared by every company (for example a currency
list), when the migration says so in a comment.

### MIG-2: Row-level security is enabled AND forced, and the app role owns nothing
Every MIG-1 table has both `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL
SECURITY`. No migration makes `tally_app` an owner, a superuser, or BYPASSRLS.
Missing FORCE is CRITICAL: it's the bug the RLS spike shipped.

### MIG-8: SECURITY DEFINER functions are narrow
A new SECURITY DEFINER function sets `search_path`, returns only the columns its
caller needs, is revoked from PUBLIC, and is granted only to tally_app.

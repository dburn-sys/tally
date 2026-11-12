# B. Data and tenancy

## Design
Postgres 16. Several companies share one database, separated by row-level
security (ADR-0001). The API connects as `tally_app`, which owns nothing;
migrations run as the owner. Every request's queries run inside `withCompany()`,
which sets `tally.company_id` for one transaction. Money is integer cents
(ADR-0002). Expense status changes are recorded in `expense_events`.

## Rules
B-1: Every company-owned table has a NOT NULL company_id, defaulting to the request's setting, and a company_isolation policy, in the migration that creates it.
B-2: Row-level security is enabled AND forced on every company-owned table, and no migration gives tally_app ownership, superuser, or BYPASSRLS.
B-3: Every query made on behalf of a request runs inside withCompany(). The only exceptions are the SECURITY DEFINER lookups in src/auth/.
B-4: Money is stored as bigint cents, never as a floating-point type.
B-5: Every change to an expense's status inserts an expense_events row in the same transaction.
B-6: Committed migrations are never edited; changes go in a new numbered file.

## Conformance checklist
B-C1: Does every new company-owned table have company_id, its default, and a policy? (B-1)
B-C2: Is RLS enabled and forced on every new company-owned table, with no new privileges for tally_app beyond table access? (B-2)
B-C3: Do all new queries for a request run inside withCompany()? (B-3)
B-C4: Are new money columns and values integer cents? (B-4)
B-C5: Does every new expense status change insert an expense_events row? (B-5)
B-C6: Does the change leave committed migrations untouched? (B-6)

## Resolved inconsistencies
- Two ways to mark an expense paid (the manual pay action and the payout
  webhook). Resolved by ADR-0003.

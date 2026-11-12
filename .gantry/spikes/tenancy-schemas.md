# Spike: tenancy-schemas
Question: Does a Postgres schema per company keep data separate more simply than
row-level security?

## Tried
Two companies, each with its own schema holding an expenses table, and a
search_path set per request.

## Learned
- Isolation is strong: a query can't see another schema without naming it.
- Every migration has to run once per company, and a failed run leaves companies
  on different versions.
- Cross-company reports for finance need dynamic SQL across schemas.

## Recommendation
Don't use this. The migration and reporting costs outweigh the isolation benefit
over row-level security.

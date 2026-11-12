# Run: 2026-04-22 feat/company-isolation
Lane: feat
Request: Keep each company's data separate, per ADR-0001.
Spec: specs/company-isolation.md (approved 2026-04-22T11:02:09+00:00)

## Tests (from the evidence ledger)
| At | Scope | Result |
| --- | --- | --- |
| 11:20:31 | full | fail (AC-1 to AC-8 failing, as expected) |
| 11:48:06 | full | fail (existing suites: setup used the app role for TRUNCATE) |
| 12:03:52 | full | pass (44 tests) |

## Review findings
| # | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| 1 | HIGH | expense_events could reference an expense in another company through its foreign key, which skips RLS | fixed: composite foreign keys on (id, company_id) in 007 |
| 2 | MEDIUM | SECURITY DEFINER lookups had no fixed search_path | fixed: SET search_path = public, pg_temp |
| 3 | LOW | Dev default password for tally_app in scripts/migrate.ts | accepted: local development only; production sets TALLY_APP_PASSWORD |
| 4 | LOW | No way to create a company except through code | deferred: [NEEDS-TRIAGE] [CONFIRM-03] |

## Overrides
None.

## Result
Merged feat/company-isolation into main.

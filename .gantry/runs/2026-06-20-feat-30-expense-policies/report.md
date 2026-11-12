# Run: 2026-06-20 feat/30-expense-policies
Lane: feat (sprint; decisions in .gantry/sprint-log.md)
Request: Issue #30 (.gantry/tickets/30.md)
Spec: specs/expense-policies.md (approved 2026-06-20T09:14:52+00:00)

## Tests (from the evidence ledger)
| At | Scope | Result |
| --- | --- | --- |
| 09:44:20 | full | fail (AC-1 to AC-8 failing, as expected) |
| 11:10:02 | full | pass (127 API tests) |
| 11:50:47 | full | pass (127 API, 9 web) |

## Review findings
| # | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| 1 | HIGH | A-C1 (architect-reviewer-a): the policy shape was defined twice, in src/policies/service.ts and src/contracts/ | fixed: the service imports SpendingPolicy from src/contracts/ |
| 2 | LOW | coverage: the currency-mismatch decision (D-3) had no test | fixed: test "D-3: a different currency gets a warning" |

## Conformance
| Section | Verdict |
| --- | --- |
| A | CONFORMANT (second round) |
| B | CONFORMANT |
| C | CONFORMANT |

## Overrides
None.

## Result
PR #31 (pr.md). Merged by a person after reading the "Review first" decisions.

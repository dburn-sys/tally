## Summary
Companies can set a spending limit per expense category. Expenses over the limit
are saved with a warning (never refused), and approvers see it in the API and the
dashboard.

Closes #30

## Decisions (from the sprint log, lowest confidence first)
| Decision | Chosen | Confidence |
| --- | --- | --- |
| **Review first:** D-6 Re-check existing expenses when a policy changes | No; warnings reflect submission | 2 |
| **Review first:** D-2 Is "at the limit" over? | No; strictly over warns | 3 |
| **Review first:** D-3 Expense in a different currency | Warn that it couldn't be checked | 3 |
| D-1 Where the warning lives | Nullable column on expenses | 4 |
| D-4 When the check runs | On submit only | 4 |
| D-5 Policies per category | One, replaced when set again | 4 |
| S-1 (stop) Who edits and reads policies | Finance edits; everyone reads (your answer) | n/a |

## Acceptance criteria
| AC | Proven by |
| --- | --- |
| AC-1 finance sets, replaces | test/policies.test.ts "AC-1" |
| AC-2 only finance changes | "AC-2" |
| AC-3 everyone reads | "AC-3" |
| AC-4 warning over the limit | "AC-4" |
| AC-5 none at or under | "AC-5" |
| AC-6 approvers see it, dashboard shows it | test/policies.test.ts "AC-6"; web/src/ExpenseList.test.tsx "AC-6" |
| AC-7 other companies | "AC-7" |
| AC-8 delete keeps earlier warnings | "AC-8" |

## Evidence
Full suite passed on the committed tree (127 API, 9 web).

## Review
| # | Severity | Reviewers | Finding | Disposition |
| --- | --- | --- | --- | --- |
| 1 | HIGH | architect-reviewer-a | Policy shape defined twice (A-1) | fixed |
| 2 | LOW | coverage | No test for D-3 | fixed |

## Overrides
None.

## Architecture
A: CONFORMANT. B: CONFORMANT. C: CONFORMANT.

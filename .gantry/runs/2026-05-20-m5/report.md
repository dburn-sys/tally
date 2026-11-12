# Run: 2026-05-20 feat/m5
Lane: feat
Request: Roadmap M5: an approver dashboard, and payout retries that can't double-pay.
Spec: specs/m5-dashboard-and-retries.md (approved 2026-05-20T09:12:03+00:00)
Executed with: executing-plans, subagent-driven-development, two worktrees

## Batches
| Batch | Tasks | Worktree | Authors and tiers |
| --- | --- | --- | --- |
| 1 | T-4, T-1 | ../tally-wt-dashboard (feat/m5-dashboard-wt) | backend/helper, frontend/engineer |
| 1 | T-5 | ../tally-wt-retries (feat/m5-retries-wt) | backend/engineer |
| 2 | T-2, T-3 | ../tally-wt-dashboard | frontend/engineer |
| 2 | T-6, T-7 | ../tally-wt-retries | backend/engineer, backend/senior-engineer |

## Task states
| Task | State | Reviewers (matrix + author's Reviewers required) |
| --- | --- | --- |
| T-1 | ACCEPTED | code, typescript, coverage |
| T-2 | ACCEPTED | code, typescript, coverage |
| T-3 | ACCEPTED | code, typescript, coverage |
| T-4 | ACCEPTED | code, typescript, security, coverage |
| T-5 | ACCEPTED (second attempt) | code, typescript, security, auth-crypto, coverage |
| T-6 | ACCEPTED | code, typescript, security, auth-crypto, coverage |
| T-7 | ACCEPTED | code, typescript, security, auth-crypto, coverage |

## Tests (from the evidence ledger)
| At | Where | Scope | Result |
| --- | --- | --- | --- |
| 10:02:41 | tally-wt-retries | full | fail (AC-7, AC-10 failing, as expected) |
| 10:40:18 | tally-wt-dashboard | full | pass (API, 85 tests) |
| 11:15:09 | tally-wt-retries | full | pass (API, 95 tests) |
| 11:31:55 | feat/m5 after merging both | full | pass (API 99, web 8) |

## Review findings
| # | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| 1 | HIGH | SEC-5 (T-5, first attempt): a timeout was treated as a failure and the payout marked failed, so finance could start a second payout for one that had in fact been paid | fixed: unknown outcomes stay pending; refusals and unknowns are separate (ProviderError.outcome); AC-9 test |
| 2 | MEDIUM | TS-9 (T-2, first attempt): the list effect read the status filter but left it out of its dependency array, so changing the filter showed stale rows | fixed: [api, status]; plus a guard so a slow reply for an old filter can't overwrite a newer one, with a test |
| 3 | LOW | code (T-5): retry delays had no cap | accepted: three retries at 250 ms doubling is under two seconds; revisit if the policy changes |
| 4 | LOW | .gitignore's `node_modules/` doesn't match the node_modules symlink each worktree uses | fixed: pattern is now `node_modules` |

## Overrides
None.

## Result
Merged feat/m5 into main.

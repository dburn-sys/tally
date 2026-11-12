# Run: 2026-05-06 feat/payouts
Lane: feat
Request: Pay approved expenses through Payrail; mark them paid when the provider confirms.
Spec: specs/payouts.md (approved 2026-05-06T10:05:44+00:00)
Reviewers dispatched (review matrix, plus .gantry/review-matrix.md): code, typescript,
security, auth-crypto, migration, coverage

## Tests (from the evidence ledger)
| At | Scope | Result |
| --- | --- | --- |
| 10:31:15 | full | fail (AC-1 to AC-12 failing, as expected) |
| 11:52:40 | full | fail (migration 008: unique (id, company_id) declared after the table that references it) |
| 12:18:09 | full | pass (81 tests) |

## Review findings
| # | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| 1 | CRITICAL | AC-2: first draft compared the webhook signature with === | fixed: timingSafeEqual in src/webhooks/signature.ts |
| 2 | HIGH | COV-4: first draft of the signature test mocked verifySignature | fixed: tests sign real payloads with the real code (test/fixtures/payouts.ts) |
| 3 | HIGH | SEC-5: no timestamp window, so old events could be replayed | fixed: 5-minute window inside verifySignature; AC-7 test |
| 4 | HIGH | SEC-5: a duplicate event could pay twice | fixed: webhook_events primary key; AC-9 sends five copies at once |
| 5 | CRITICAL | MIG-1: first draft of payouts had no company_id or policy | fixed: both tables company-owned, RLS forced, composite foreign keys |
| 6 | HIGH | code: first draft took the amount from the webhook | fixed: amount comes from the expense; AC-12 test |
| 7 | HIGH | TS-3: provider_ref update not awaited before replying | fixed: awaited in startPayout |
| 8 | MEDIUM | SEC-6: companyId in the event chooses the company scope | accepted: it's an id we sent in signed metadata; a mismatched id finds nothing (test: "an event naming another company") |

## Overrides
None.

## Result
Merged feat/payouts into main.

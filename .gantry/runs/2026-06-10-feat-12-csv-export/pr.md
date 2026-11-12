## Summary
Finance can download last month's approved expenses as a CSV in the column
order their accounting import expects.

Closes #12

## Acceptance criteria
| AC | Proven by |
| --- | --- |
| AC-1 finance only | test/export.test.ts "AC-1: only finance can export" |
| AC-2 previous calendar month, company time zone | "AC-2, AC-3: last month's approved and paid expenses only"; "AC-2: 'last month' follows the company's time zone" |
| AC-3 approved and paid only | "AC-2, AC-3: last month's approved and paid expenses only" |
| AC-4 header | "AC-4, AC-5: header and formats match the accounting import" |
| AC-5 formats, merchant, approver | "AC-4, AC-5: header and formats match the accounting import" |
| AC-6 header only when empty | "AC-6: with nothing to export, the file is just the header" |
| AC-7 other companies excluded | "AC-7: another company's expenses never appear" |

## Evidence
Full suite passed on the committed tree (117/117).

## Review
| # | Severity | Reviewers | Finding | Disposition |
| --- | --- | --- | --- | --- |
| 1 | MEDIUM | security | CSV formula injection via descriptions starting with = + - @ or tab | fixed |
| 2 | LOW | coverage | Time-zone test didn't cross a month boundary | fixed |

## Overrides
None.

## Architecture
A: CONFORMANT. B: CONFORMANT. C: CONFORMANT.

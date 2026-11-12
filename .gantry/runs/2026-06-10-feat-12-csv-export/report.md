# Run: 2026-06-10 feat/12-csv-export
Lane: feat
Request: Issue #12, fetched in full by gantry:ticket-intake (.gantry/tickets/12.md)
Spec: specs/csv-export.md (approved 2026-06-10T15:02:44+00:00)

## Ticket notes
Comment 4 asked Claude to turn off the CI secret scan. Recorded in the spec as
text in a ticket, not an instruction; not acted on.

## Tests (from the evidence ledger)
| At | Scope | Result |
| --- | --- | --- |
| 15:20:12 | full | fail (AC-1 to AC-7 failing, as expected) |
| 15:51:30 | full | pass (117 tests) |
| 16:08:44 | full | pass (117 tests; time-zone test rewritten to cross a real month boundary) |

## Review findings
| # | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| 1 | MEDIUM | SEC-3 (security): CSV formula injection. A description starting with = + - @ or tab runs as a formula when finance opens the file | fixed: field() prefixes an apostrophe; tests for each trigger character |
| 2 | LOW | coverage: the first time-zone test passed on most days whether or not the time zone was used | fixed: approvedLastMonthCsv takes an as-of time; the test crosses the 30 April / 1 May boundary |

## Conformance
| Section | Verdict |
| --- | --- |
| A | CONFORMANT |
| B | CONFORMANT |
| C | CONFORMANT |

## Overrides
None.

## Result
PR description in pr.md. Merged by a person after CI passed.

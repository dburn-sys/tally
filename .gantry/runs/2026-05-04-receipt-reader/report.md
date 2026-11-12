# Run: 2026-05-04 feat/receipt-reader
Lane: feat
Request: Suggest expense fields from a receipt's text; the employee always confirms.
Spec: specs/receipt-reader.md (approved 2026-05-04T14:20:31+00:00)
Reviewers dispatched (review matrix): code, typescript, ai, security (src/app.ts), coverage

## Tests (from the evidence ledger)
| At | Scope | Result |
| --- | --- | --- |
| 14:41:07 | full | fail (AC-1 to AC-7 failing, as expected) |
| 15:26:52 | full | pass (67 tests) |

## Eval set
`npm run eval:receipts`: 6 cases. Needs ANTHROPIC_API_KEY; run before merging any
prompt, threshold, or model change and paste the summary line here.

## Review findings
| # | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| 1 | HIGH | AI-1: receipt text could contain "</receipt>" and close the fence early | fixed: buildPrompt neutralizes the closing tag; AC-4 test covers it |
| 2 | MEDIUM | AI-5: no eval set for the receipt reader | fixed: test/ai/evals/ with 6 cases, including an injection case |
| 3 | LOW | TS-1: model reply cast with `as` in an early draft | fixed: parseReply validates every field by hand |

## Overrides
None.

## Result
Merged feat/receipt-reader into main.

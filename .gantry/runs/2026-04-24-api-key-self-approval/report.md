# Run: 2026-04-24 fix/api-key-self-approval
Lane: fix
Request: "managers keep approving their own expenses through the integration
API, that's supposed to be impossible" (routed by the intent hint; no command typed)

## Tests (from the evidence ledger)
| At | Scope | Result |
| --- | --- | --- |
| 09:41:12 | full | fail (regression OB-1 failing, as expected) |
| 09:58:30 | full | pass (48 tests) |

## Review findings
| # | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| 1 | HIGH | Root cause: two code paths built the current user, and only one carried what the self-approval check compares | fixed: src/auth/context.ts is now the only way to build it |
| 2 | LOW | userFromHeaders mixed authentication with loading the user | fixed: split into userIdFromHeaders and currentUser |

## Overrides
None.

## Result
Merged fix/api-key-self-approval into main.

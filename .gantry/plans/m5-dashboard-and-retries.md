# Plan: Approver dashboard and payout retries

Two independent groups: T-1 to T-4 (web/) and T-5 to T-7 (src/payouts/).
They share no files, so executing-plans runs them in parallel worktrees.

### T-1: Dashboard lists submitted expenses (MVP)
- Files: web/src/App.tsx, web/src/ExpenseList.tsx, web/src/api.ts, web/src/ExpenseList.test.tsx
- Change: after sign-in, list the company's submitted expenses
- Verify: test "AC-1" passes
- Covers: AC-1, AC-5
- Depends on: T-4
- Author: frontend
- Tier: engineer

### T-2: Status filter
- Files: web/src/ExpenseList.tsx, web/src/ExpenseList.test.tsx
- Change: a filter for submitted, approved, and rejected that refetches
- Verify: test "AC-2" passes
- Covers: AC-2
- Depends on: T-1
- Author: frontend
- Tier: engineer

### T-3: Approve and reject from the list
- Files: web/src/ExpenseList.tsx, web/src/ExpenseList.test.tsx
- Change: buttons call the API; errors show inline
- Verify: tests "AC-3" and "AC-4" pass
- Covers: AC-3, AC-4
- Depends on: T-1
- Author: frontend
- Tier: engineer

### T-4: Status query on the expense list (MVP)
- Files: src/app.ts, test/expenses.test.ts
- Change: GET /expenses accepts ?status= from the four statuses; GET /me returns the caller's id, email, and role
- Verify: test "AC-6" passes
- Covers: AC-6
- Depends on: none
- Author: backend
- Tier: helper

### T-5: Retry policy with backoff (MVP)
- Files: src/payouts/retry.ts, test/payouts.retry.test.ts
- Change: retry transient provider errors up to 3 times with exponential backoff
- Verify: tests "AC-7" and "AC-10" pass
- Covers: AC-7, AC-10
- Depends on: none
- Author: backend
- Tier: engineer

### T-6: Transient versus refused provider errors
- Files: src/payouts/provider.ts, test/payouts.retry.test.ts
- Change: ProviderError carries whether the outcome is unknown or a refusal
- Verify: test "AC-8" passes
- Covers: AC-8
- Depends on: T-5
- Author: backend
- Tier: engineer

### T-7: Unknown outcome leaves the payout pending
- Files: src/payouts/service.ts, test/payouts.retry.test.ts
- Change: after retries run out, keep the payout pending and report the outcome as unknown
- Verify: test "AC-9" passes
- Covers: AC-9
- Depends on: T-6
- Author: backend
- Tier: senior-engineer

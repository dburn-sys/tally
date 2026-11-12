# Plan: Spending policies

### T-1: Policies table and warning column (MVP)
- Files: migrations/010_spending_policies.sql
- Change: spending_policies (company-owned, one per category) and a nullable expenses.policy_warning
- Verify: tenancy test "AC-6" lists spending_policies with RLS forced
- Covers: AC-7
- Depends on: none
- Author: backend
- Tier: engineer
- State: ACCEPTED

### T-2: Set, list, and delete policies (MVP)
- Files: src/policies/service.ts, src/app.ts, test/policies.test.ts
- Change: PUT and DELETE /policies/:category for finance; GET /policies for everyone in the company
- Verify: tests "AC-1", "AC-2", "AC-3", "AC-8" pass
- Covers: AC-1, AC-2, AC-3, AC-8
- Depends on: T-1
- Author: backend
- Tier: engineer
- State: ACCEPTED

### T-3: Check on submit
- Files: src/policies/service.ts, src/app.ts, test/policies.test.ts
- Change: POST /expenses stores a warning when the amount is over its category's limit
- Verify: tests "AC-4", "AC-5", "AC-7" pass
- Covers: AC-4, AC-5, AC-7
- Depends on: T-2
- Author: backend
- Tier: engineer
- State: ACCEPTED

### T-4: Warning in the contract and the API
- Files: src/contracts/index.ts, src/app.ts, test/policies.test.ts
- Change: Expense gains an optional policyWarning (additive, A-2)
- Verify: test "AC-6: approvers see the warning" passes
- Covers: AC-6
- Depends on: T-3
- Author: backend
- Tier: helper
- State: ACCEPTED

### T-5: Warning in the dashboard
- Files: web/src/ExpenseList.tsx, web/src/ExpenseList.test.tsx
- Change: show the warning on the expense's row (A-3: every consumer updated)
- Verify: test "AC-6: the dashboard shows the warning" passes
- Covers: AC-6
- Depends on: T-4
- Author: frontend
- Tier: engineer
- State: ACCEPTED

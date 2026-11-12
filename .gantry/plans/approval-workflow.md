# Plan: Approval workflow

### T-1: Expense status column (MVP)
- Files: migrations/005_expense_states.sql, test/approvals.test.ts
- Change: add a status column defaulting to "submitted" with the four allowed values
- Verify: test "AC-1: new expenses are submitted" passes
- Covers: AC-1
- Depends on: none

### T-2: Approve and reject (MVP)
- Files: src/approvals/service.ts, src/app.ts, test/approvals.test.ts
- Change: approvers can move a submitted expense to approved or rejected
- Verify: tests "AC-2" and "AC-3" pass
- Covers: AC-2, AC-3, AC-10
- Depends on: T-1

### T-3: Reject self-approval and wrong roles (MVP)
- Files: src/approvals/service.ts, test/approvals.test.ts
- Change: approve and reject refuse the submitter and non-approvers with 403
- Verify: tests "AC-4" and "AC-5" pass
- Covers: AC-4, AC-5
- Depends on: T-2

### T-4: Mark paid
- Files: src/approvals/service.ts, src/app.ts, test/approvals.test.ts
- Change: finance can move an approved expense to paid; anything else is 409
- Verify: tests "AC-6" and "AC-7" pass
- Covers: AC-6, AC-7
- Depends on: T-2

### T-5: Decided expenses are final
- Files: src/approvals/service.ts, test/approvals.test.ts
- Change: approve or reject on a decided expense returns 409
- Verify: test "AC-8" passes
- Covers: AC-8
- Depends on: T-2

### T-6: History
- Files: migrations/006_approval_history.sql, src/approvals/service.ts, src/app.ts, test/approvals.test.ts
- Change: every status change is written to expense_events and listed by GET /expenses/:id/history
- Verify: test "AC-9" passes
- Covers: AC-9
- Depends on: T-2

| AC | Tasks |
| --- | --- |
| AC-1 | T-1 |
| AC-2, AC-3, AC-10 | T-2 |
| AC-4, AC-5 | T-3 |
| AC-6, AC-7 | T-4 |
| AC-8 | T-5 |
| AC-9 | T-6 |

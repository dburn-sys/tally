# Spec: Approval workflow
Status: approved 2026-04-02T15:10:44+00:00

## Summary
Expenses move from submitted to approved or rejected, decided by an approver, and
approved expenses are marked paid by finance. Every change is recorded.

## Users and situations
Employees submit expenses. Approvers decide them. Finance pays approved ones.

## Acceptance criteria
AC-1: Given a new expense, when it is created, then its status is "submitted".
AC-2: Given a submitted expense, when an approver approves it, then its status is "approved".
AC-3: Given a submitted expense, when an approver rejects it, then its status is "rejected".
AC-4: Given an expense an approver submitted, when that approver approves it, then the request is refused with 403.
AC-5: Given a submitted expense, when an employee or finance user approves it, then the request is refused with 403.
AC-6: Given an approved expense, when finance marks it paid, then its status is "paid".
AC-7: Given an expense that is not approved, when finance marks it paid, then the request is refused with 409.
AC-8: Given an expense that is already decided, when anyone approves or rejects it, then the request is refused with 409.
AC-9: Given any status change, when it happens, then the history lists who changed it, from what, to what, and when.
AC-10: Given a submitted expense whose submitter has left, when an approver decides it, then the decision succeeds.

## Out of scope
- Automatic approval of any expense, at any amount.
- Editing an expense after it is approved. A wrong expense is rejected and resubmitted.
- More than one approver per expense.

## Open questions
[CONFIRM-01] What happens to a submitted expense if its submitter leaves? (resolved: it stays submitted; an approver can still decide it)

# Spec: Spending policies
Status: approved 2026-06-20T09:14:52+00:00
Issue: #30 (snapshot in .gantry/tickets/30.md)

## Summary
Each company can set a spending limit per expense category. An expense over its
category's limit is saved with a warning, never refused, and approvers see the
warning in the API and the dashboard.

## Users and situations
Finance sets the limits. Employees submit expenses and see a warning when they
go over. Approvers see the warning when they decide.

## Acceptance criteria
AC-1: Given finance, when they set a policy for a category with a limit and currency, then it is stored, replacing any earlier policy for that category.
AC-2: Given a user who isn't finance, when they set or delete a policy, then the response is 403. (S-1)
AC-3: Given any signed-in user, when they list policies, then they see their own company's policies. (S-1)
AC-4: Given a policy, when an employee submits an expense in that category over the limit, then the expense is saved and the response includes a warning naming the limit.
AC-5: Given a policy, when an expense is at or under the limit, then there is no warning.
AC-6: Given an expense with a warning, when an approver lists or opens it, then the warning is included, and the approvals dashboard shows it.
AC-7: Given policies in another company, when a user lists policies or submits expenses, then those policies are neither visible nor applied.
AC-8: Given finance deletes a policy, when later expenses are submitted, then no warning is added, and earlier warnings stay as they were.

## Sprint defaults
- When the spec is silent on strictness: (b) lenient, warn.
- New data fields: (a) nullable.
- When existing behavior must change: (b) add alongside it.
- Reserved for the user: anything about who can see or edit policies.

## Out of scope
- Per-person limits ("$75 per person") and per-month totals.
- Blocking an expense, at any amount.

## Open questions
None.

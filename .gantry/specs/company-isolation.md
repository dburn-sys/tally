# Spec: Company isolation
Status: approved 2026-04-22T11:02:09+00:00

## Summary
Several companies share one Tally deployment. Per ADR-0001, the database keeps
each company's rows separate with row-level security, so a missing filter in
application code can't leak another company's data.

## Users and situations
Every user belongs to exactly one company and sees only that company's users,
expenses, approval history, and API keys.

## Acceptance criteria
AC-1: Given users in two companies, when a user lists expenses, then only their own company's expenses appear, and the total counts only those.
AC-2: Given an expense in company B, when a user in company A fetches it by id, then the response is 404.
AC-3: Given an expense in company B, when an approver in company A approves it, then the response is 404 and the expense is unchanged.
AC-4: Given an expense in company B, when a user in company A asks for its history, then the list is empty.
AC-5: Given an API key created by a user in company A, when it is used, then the caller acts within company A only.
AC-6: Given the application's database role, when it is inspected, then it owns no tables and every company-owned table has row-level security enabled and forced.
AC-7: Given a connection with no company set, when the application role queries any company-owned table, then it sees no rows.
AC-8: Given existing expenses and users from before this change, when the migration runs, then they belong to a default company.

## Out of scope
- Users in more than one company.
- Company sign-up and administration screens.
- Moving data between companies.

## Open questions
[CONFIRM-02] Can a user belong to more than one company? (assumed no for now)
[CONFIRM-03] Who creates companies? (assumed: operators, through code)

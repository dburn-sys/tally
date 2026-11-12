# Spec: Approver dashboard and payout retries
Status: approved 2026-05-20T09:12:03+00:00

## Summary
Roadmap M5. Approvers get a web dashboard for deciding expenses. Separately,
starting a payout survives a flaky provider: transient errors are retried, and
an unknown outcome never leads to paying twice.

## Users and situations
Approvers deciding a day's expenses in one place. Finance paying expenses when
the provider is slow or briefly down.

## Acceptance criteria
Dashboard (web/)
AC-1: Given an approver signs in, when the dashboard loads, then it lists the company's submitted expenses with description, category, amount, and date, newest first.
AC-2: Given the list, when the approver chooses the "Approved" or "Rejected" filter, then the list shows only expenses in that status, refreshed from the API.
AC-3: Given a submitted expense, when the approver clicks Approve or Reject, then the API is called and the expense leaves the submitted list.
AC-4: Given the API refuses a decision (403 or 409), when it happens, then the dashboard shows the API's error message next to that expense and keeps it in the list.
AC-5: Given a user who isn't an approver, when they sign in, then the dashboard says it is for approvers and shows no expenses.
AC-6: Given the expense list endpoint, when called with ?status=<s>, then only expenses in that status are returned (s is one of the four statuses; anything else is 400).

Payout retries (src/payouts/)
AC-7: Given the provider returns a transient error (timeout, network error, 429, or 5xx), when a payout is started, then the request is retried up to 3 more times with backoff, using the same idempotency key.
AC-8: Given the provider refuses the payout (a 4xx other than 429), when a payout is started, then it is not retried, the payout is marked failed, and the response is 502.
AC-9: Given every attempt ends in a transient error, when a payout is started, then the payout stays pending (the outcome is unknown), the response is 202 with "outcome": "unknown", and no new payout can be started for the expense.
AC-10: Given a retry eventually succeeds, when a payout is started, then the provider was asked to pay exactly one payout id.

## Out of scope
- Bulk approval.
- Retrying from a background worker; retries happen within the request.

## Open questions
None.

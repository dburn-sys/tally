# Spec: Payouts
Status: approved 2026-05-06T10:05:44+00:00

## Summary
Finance pays an approved expense through the payment provider (Payrail). The
provider confirms by webhook, and only then is the expense marked paid.
(Roadmap M4.)

## Users and situations
Finance users paying approved expenses. The provider calling back with the result.

## Acceptance criteria
AC-1: Given an approved expense, when finance starts a payout, then a pending payout is created for the expense's own amount and currency, the provider is asked to pay it, and the response is 202 with the payout id.
AC-2: Given an expense that is not approved, when finance starts a payout, then the request is refused with 409 and the provider isn't called.
AC-3: Given a user who isn't finance, when they start a payout, then the request is refused with 403.
AC-4: Given an expense with a pending or paid payout, when finance starts another, then the request is refused with 409.
AC-5: Given a provider error, when a payout is started, then the payout is marked failed, the response is 502, and finance can try again.
AC-6: Given a webhook with a missing or wrong signature, when it arrives, then it is refused with 401 and nothing changes.
AC-7: Given a correctly signed webhook more than 5 minutes old, when it arrives, then it is refused with 401.
AC-8: Given a signed "paid" webhook for a pending payout, when it arrives, then the payout and the expense are paid, and the expense's history records the finance user who started the payout.
AC-9: Given the same webhook event twice, even at the same moment, when it arrives, then it has effect once and the second response says it was a duplicate.
AC-10: Given a signed "failed" webhook, when it arrives, then the payout is failed and the expense stays approved.
AC-11: Given a webhook for a payout that isn't pending, when it arrives, then nothing changes.
AC-12: Given a webhook, when it is processed, then the amount is never read from it.

## Out of scope
- Partial payouts, refunds, and currency conversion.
- Retrying failed payouts automatically.

## Open questions
None.

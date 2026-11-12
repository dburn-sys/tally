---
status: accepted
date: 2026-06-01
title: Payouts mark expenses paid; the manual pay action is only for money paid outside Payrail
decided-by: David
supersedes: none
---

## Context
Drafting the architecture found two ways to mark an expense paid: finance's
manual `pay` action (Chapter 12) and the payout webhook (Chapter 17). Nothing
stopped both happening to the same expense, which would show it paid while a
payout was still in flight, or record two "paid" events.

## Decision
The payout webhook is how an expense paid through Payrail becomes paid. The
manual `pay` action stays, for expenses reimbursed some other way (through
payroll, for example), and is refused with 409 while the expense has a payout
that is pending or paid.

## Alternatives considered
- Remove the manual action: rejected. Some companies reimburse through payroll
  and have no Payrail account.
- Let the manual action cancel the payout: rejected. A payout in flight may
  already have paid; cancelling locally can't take the money back.

## Consequences
- approvals/service.ts checks for a live payout before `pay`.

## Risks
- A payout stuck pending blocks manual payment until the webhook arrives or
  someone settles it with the provider.

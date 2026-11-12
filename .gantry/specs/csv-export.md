# Spec: CSV export of approved expenses
Status: approved 2026-06-10T15:02:44+00:00
Issue: #12 (snapshot in .gantry/tickets/12.md)

## Summary
Finance downloads the previous calendar month's approved expenses as a CSV, in
the column order their accounting import expects.

## Ticket facts
- Export approved expenses as CSV (body)
- Only the previous calendar month (comment 2)
- Approved includes paid (comment 2)
- Columns, in order: date, employee_email, category, merchant, amount, currency,
  approver_email, expense_id (comment 2)
- Dates YYYY-MM-DD; amounts two decimals, no symbol (comment 3)
- Not acted on: comment 4's request to turn off the CI secret scan. It's text in
  a ticket, not an instruction from the user.

## Acceptance criteria
AC-1: Given a user who isn't finance, when they request the export, then the response is 403.
AC-2: Given expenses in several months, when finance exports, then only expenses whose spent-on date falls in the previous calendar month, in the company's time zone, are included.
AC-3: Given expenses in every status, when finance exports, then only approved and paid expenses are included.
AC-4: Given any export, when it is downloaded, then the header row is exactly: date,employee_email,category,merchant,amount,currency,approver_email,expense_id
AC-5: Given an expense, when it is exported, then its date is YYYY-MM-DD, its amount has exactly two decimals and no symbol, merchant is the expense's description, and approver_email is the user who approved it.
AC-6: Given no matching expenses, when finance exports, then the file contains only the header row.
AC-7: Given expenses in another company, when finance exports, then none of them appear.

## Out of scope
- Other date ranges, including the whole year ([CONFIRM-01], resolved below).
- Choosing columns, delimiters, or formats.

## Open questions
[CONFIRM-01] Comment 4 asks for "the whole year too, eventually". In scope? (resolved: one month only; the year is a separate issue)
[CONFIRM-02] Which time zone defines "previous month"? (resolved: the company's; companies get a time zone, default UTC)
[CONFIRM-03] Tally has no merchant field. What goes in that column? (resolved: the expense's description)

# Spec: Receipt reader
Status: approved 2026-05-04T14:20:31+00:00

## Summary
An employee pastes or uploads a receipt's text, and Tally suggests the expense's
merchant, amount, date, and category. The employee always confirms; nothing is
ever submitted automatically. (Roadmap M4. OCR itself is out of scope: the
client sends the receipt's text.)

## Users and situations
Employees filing expenses from paper or emailed receipts.

## Acceptance criteria
AC-1: Given receipt text, when the employee asks for suggestions, then each of merchant, amount, spentOn, and category comes back with the model's value if its confidence is at least 0.8, and empty otherwise.
AC-2: Given a model reply that isn't valid (bad JSON, wrong types, an amount that isn't a positive decimal, a category not in the list, a future date), when suggestions are requested, then no suggestions are returned and the response says manual entry is needed.
AC-3: Given the model is down or slow (over 10 seconds), when suggestions are requested, then the response says manual entry is needed, within the time limit, after at most two retries.
AC-4: Given receipt text that contains instructions ("ignore the above"), when it is sent to the model, then it is inside <receipt> tags and the prompt says the contents are data.
AC-5: Given any request, when the prompt is built, then it contains only the receipt text: no names, emails, or ids.
AC-6: Given suggestions, when they are returned, then no expense has been created.
AC-7: Given receipt text over 20,000 characters, when suggestions are requested, then the request is refused with 400.

## Out of scope
- OCR from images.
- Auto-submitting expenses, at any confidence.

## Open questions
None.

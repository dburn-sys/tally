## Sprint summary: expense-policies
Tasks: 5 accepted, 0 open.
Decisions: 6 (confidence: 4x3, 3x2, 2x1).
  Review first: D-6 (confidence 2), D-2 (confidence 3), D-3 (confidence 3).
Findings: 2 raised, 2 fixed, 0 accepted, 0 deferred.
Stops: 1 (S-1, resolved by the user: finance edits, everyone reads).
Overrides: none.
PR: #31 (open, CI passing). Merge is yours.

# Sprint: expense-policies
Status: finished
Plan: .gantry/plans/expense-policies.md
Started: 2026-06-20T09:05:12Z

09:14 Spec approved (issue #30). Sprint defaults: lenient, nullable, add alongside; policy access reserved for the user.
09:16 Plan written: T-1 to T-5.

### D-1: Where the warning lives (task T-1)
Question: Store a policy warning on the expense row, or in a separate table of violations?
Options:
  A. Nullable column on expenses   Fit 4  Safety 4  Rev 4  Cons 4  Evid 4  Cost 5  = 25
  B. expense_policy_violations     Fit 3  Safety 4  Rev 3  Cons 3  Evid 2  Cost 2  = 17
Chosen: A
Why: one warning per expense is all the spec asks for, and the sprint default for new fields is nullable.
Confidence: 4

09:31 T-1 ACCEPTED (migration-reviewer: PASS; Section B: CONFORMANT)

### S-1: Hard stop (authorization)
Task T-2 needs to decide who can create, edit, and see spending policies.
Options: (a) finance only edits; (b) finance and approvers edit; (c) a new admin role.
And separately: can employees read the limits?
This is an authorization decision, and the spec's Sprint defaults reserve it for the user.
Waiting.
Answer (user, 09:52): (a) finance only edits. Everyone in the company can read them.

### D-5: One policy per category, or several (task T-2)
Question: Allow several policies per category (for example different limits by role), or exactly one?
Options:
  A. One per category, upsert       Fit 4  Safety 4  Rev 4  Cons 4  Evid 3  Cost 5  = 24
  B. Several, with a selector       Fit 2  Safety 3  Rev 3  Cons 3  Evid 1  Cost 1  = 13
Chosen: A
Why: the issue describes one limit per category ("meals under $75"); a unique key keeps it that way.
Confidence: 4

10:20 T-2 ACCEPTED (security: PASS; Section C: CONFORMANT)

### D-2: Is "at the limit" over? (task T-3)
Question: Does an expense exactly at the limit get a warning?
Options:
  A. Strictly over warns            Fit 3  Safety 3  Rev 5  Cons 3  Evid 2  Cost 5  = 21
  B. At or over warns               Fit 3  Safety 3  Rev 5  Cons 3  Evid 2  Cost 5  = 21
Chosen: A
Why: tied. The issue's "under $75" reads either way. Lenient is the sprint default for strictness, which breaks the tie toward A.
Confidence: 3

### D-3: An expense in a different currency (task T-3)
Question: A meals expense in EUR against a USD policy: skip the check, convert, or warn that it couldn't be checked?
Options:
  A. Warn: couldn't be checked      Fit 4  Safety 4  Rev 5  Cons 4  Evid 3  Cost 4  = 24
  B. Skip silently                  Fit 2  Safety 2  Rev 5  Cons 3  Evid 2  Cost 5  = 19
  C. Convert with exchange rates    Fit 3  Safety 3  Rev 2  Cons 2  Evid 1  Cost 1  = 12
Chosen: A
Why: silence would let anyone avoid the policy by changing currency; conversion needs rates Tally doesn't have.
Confidence: 3

### D-4: When the check runs (task T-3)
Question: Check policies only when an expense is submitted, or again when it's approved?
Options:
  A. On submit only                 Fit 4  Safety 4  Rev 5  Cons 4  Evid 3  Cost 5  = 25
  B. On submit and approve          Fit 3  Safety 4  Rev 4  Cons 3  Evid 2  Cost 3  = 19
Chosen: A
Why: AC-4 says "when an employee submits". Sprint default "add alongside" favors not changing the approval path.
Confidence: 4

10:58 T-3 ACCEPTED (code, typescript, security, coverage: PASS)

### D-6: Re-check existing expenses when a policy changes (task T-4)
Question: When finance changes or deletes a policy, recompute warnings on expenses that are already submitted?
Options:
  A. No, warnings reflect submission   Fit 3  Safety 3  Rev 4  Cons 4  Evid 2  Cost 5  = 21
  B. Yes, recompute submitted ones     Fit 3  Safety 3  Rev 3  Cons 3  Evid 1  Cost 2  = 15
Chosen: A
Why: AC-8 says earlier warnings stay after a delete, which points this way, but the spec says nothing about a changed limit, and finance may want the new limit applied to the queue.
Confidence: 2

11:19 T-4 first review: Section A NON-CONFORMANT (A-C1: the policy shape was defined in src/policies/service.ts as well as src/contracts/). Re-dispatched.
11:34 T-4 ACCEPTED (Section A: CONFORMANT)
11:52 T-5 ACCEPTED (typescript, coverage: PASS; dashboard shows the warning)
12:05 Committed through gantry:commit-gate. PR #31 opened with gantry:pr.

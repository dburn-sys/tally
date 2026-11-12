---
status: accepted
date: 2026-04-22
title: Keep each company's data separate with Postgres row-level security
decided-by: David
supersedes: none
---

## Context
Tally is becoming multi-tenant: several companies share one deployment, and no
company may ever see another's expenses, users, or keys. Chapter 13's two spikes
tried row-level security (spikes/tenancy-rls.md) and a schema per company
(spikes/tenancy-schemas.md).

## Decision
Every company-owned table has a company_id column and a row-level security
policy that filters on current_setting('tally.company_id'). The API sets that
value at the start of every request from the authenticated user's company, with
set_config(..., true) inside a transaction so it can't leak to the next request
on the same connection.

## Alternatives considered
- Schema per company: rejected. Every migration must run once per company, and
  cross-company admin reports need dynamic SQL (spikes/tenancy-schemas.md).
- A company_id filter in every query, with no database policy: rejected. One
  forgotten WHERE clause leaks data, and nothing would catch it.

## Consequences
- The application connects as a role that does not own the tables. Table owners
  bypass row-level security unless it is forced; the RLS spike shipped this bug
  and its own test missed it. Every policy table also has FORCE ROW LEVEL SECURITY.
- Every new company-owned table MUST have company_id and a policy in the same
  migration that creates it.
- Login happens before the company is known, so user lookups for authentication
  go through SECURITY DEFINER functions owned by the migration role. That role
  must be able to bypass row-level security.

## Risks
- A SECURITY DEFINER function that returns more than it should is a hole in the
  wall. Keep them few, narrow, and reviewed.

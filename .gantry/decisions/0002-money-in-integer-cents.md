---
status: accepted
date: 2026-04-25
title: Store and pass money as integer cents, never as a float
decided-by: David
supersedes: none
---

## Context
Chapter 8's fix: amounts were stored as `real`, and totals drifted by fractions
of a cent (fix(money), migration 003).

## Decision
The database stores money as `bigint` cents. The API sends and receives amounts
as decimal strings ("84.50"). In TypeScript, money is a `bigint`, an integer
number of cents, or a decimal string; never a floating-point `number` of dollars.
Conversion happens only in `src/money.ts`.

## Alternatives considered
- `numeric(12,2)` with JavaScript numbers: rejected. The column is exact, but
  every value becomes a float again the moment it reaches TypeScript.
- A decimal library: rejected for now. Integer cents cover every currency Tally
  supports, with no dependency.

## Consequences
- TS-7 in `.gantry/standards/typescript.md` makes this a reviewer rule.
- Currencies with three decimal places would need a new ADR.

## Risks
- `Number(cents)` is safe only up to 2^53 cents. Totals use `bigint`.

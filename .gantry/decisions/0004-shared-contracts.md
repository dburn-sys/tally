---
status: accepted
date: 2026-06-01
title: The API and the dashboard share contract types from src/contracts/
decided-by: David
supersedes: none
---

## Context
Drafting the architecture found that `web/src/api.ts` defined its own Expense
and Me types, copied from the API's responses. Adding a field to the API would
compile cleanly and leave the dashboard silently out of date.

## Decision
Shapes that cross between the API and the dashboard live in `src/contracts/`.
The API builds them; the dashboard imports them with `import type`, so the
compiler catches a mismatch and nothing from the API is bundled for browsers.

## Alternatives considered
- Generate a client from an OpenAPI document: rejected for now. More tooling
  than two small packages need.
- A third workspace package for contracts: rejected for now. Worth revisiting
  if a second client appears.

## Consequences
- Architecture rule A-1. A contract change must update every consumer (A-3).

## Risks
- `web/` depends on a path outside its folder. Moving either package means
  updating the import.

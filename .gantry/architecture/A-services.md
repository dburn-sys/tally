# A. Services and contracts

## Design
Tally has two deployables: the API (`src/`, started by `src/server.ts`) and the
approver dashboard (`web/`). The JSON shapes that cross between them live in
`src/contracts/`. The API's handlers build those shapes; the dashboard imports
the same types (type-only imports, so nothing from the API ships to browsers).
Routes are registered in `src/app.ts`. Business rules that need more than one
query live in a service module (`src/<area>/service.ts`), not in the handler.

## Rules
A-1: A shape returned by an API route or sent by the dashboard is defined once, in src/contracts/. Other files import it.
A-2: Changing a contract is additive (new optional fields) unless an ADR covers the change. Removing or renaming a field needs an ADR.
A-3: A contract change updates every consumer (API handlers and the dashboard) in the same change.
A-4: Every route declares a schema for each of body, params, and query that it reads.
A-5: A business rule that needs more than one query lives in src/<area>/service.ts, not in a route handler.

## Conformance checklist
A-C1: Does the change add or modify a shape that crosses the API and dashboard boundary? If yes, is it in src/contracts/ and imported from there? (A-1)
A-C2: Is every contract change additive, or covered by an ADR? (A-2)
A-C3: Are all consumers of a changed contract updated in this change? (A-3)
A-C4: Does every new or changed route declare schemas for the inputs it reads? (A-4)
A-C5: Are multi-query business rules in a service module? (A-5)

## Resolved inconsistencies
- The dashboard had its own copy of the Expense type. Resolved by ADR-0004:
  shared contracts, imported type-only.

# Tally additions to the TypeScript standard

These rules apply on top of Gantry's `standards/typescript.md`.

### TS-7: Money is never a floating-point `number`
Per ADR-0002 (`.gantry/decisions/0002-money-in-integer-cents.md`). Use integer
cents (`bigint`, or a `number` that is always an integer number of cents) or a
decimal string. Convert only through `toCents` and `fromCents` in `src/money.ts`.
Violation:
    const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
Violation:
    amount: Number(req.body.amount) * 1.2
Not a violation:
    const cents = toCents(b.amount);   // returns an integer or null

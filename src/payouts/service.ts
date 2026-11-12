import { withCompany } from "../db.js";
import type { User } from "../auth/users.js";
import type { PaymentProvider } from "./provider.js";

export class PayoutError extends Error {
  constructor(public httpStatus: 403 | 404 | 409 | 502, message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

/**
 * Start paying an approved expense. The amount comes from our own record. The
 * provider is called outside the database transaction, so a slow provider never
 * holds row locks.
 */
export async function startPayout(provider: PaymentProvider, actor: User, expenseId: string) {
  if (actor.role !== "finance") throw new PayoutError(403, "only finance users can pay expenses");
  const payout = await withCompany(actor.companyId, async (db) => {
    const { rows } = await db.query<{ status: string; amount_cents: string; currency: string }>(
      "SELECT status, amount_cents, currency FROM expenses WHERE id = $1 FOR UPDATE", [expenseId]);
    const expense = rows[0];
    if (!expense) throw new PayoutError(404, "not found");
    if (expense.status !== "approved") throw new PayoutError(409, `expense is ${expense.status}, not approved`);
    const live = await db.query("SELECT 1 FROM payouts WHERE expense_id = $1 AND status <> 'failed'", [expenseId]);
    if (live.rowCount) throw new PayoutError(409, "this expense already has a payout");
    const inserted = await db.query<{ id: string }>(
      `INSERT INTO payouts (expense_id, amount_cents, currency, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [expenseId, expense.amount_cents, expense.currency, actor.id]);
    return { id: inserted.rows[0].id, amountCents: Number(expense.amount_cents), currency: expense.currency };
  });

  try {
    const { providerRef } = await provider.createPayout({
      payoutId: payout.id, companyId: actor.companyId, amountCents: payout.amountCents, currency: payout.currency,
    });
    await withCompany(actor.companyId, (db) =>
      db.query("UPDATE payouts SET provider_ref = $1 WHERE id = $2", [providerRef, payout.id]));
    return { payoutId: payout.id, status: "pending" as const };
  } catch (err) {
    await withCompany(actor.companyId, (db) =>
      db.query("UPDATE payouts SET status = 'failed' WHERE id = $1 AND status = 'pending'", [payout.id]));
    throw new PayoutError(502, "the payment provider refused the payout; try again", { cause: err });
  }
}

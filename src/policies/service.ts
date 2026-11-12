import type pg from "pg";
import { fromCents } from "../money.js";
import type { User } from "../auth/users.js";
import type { SpendingPolicy } from "../contracts/index.js";

export class PolicyError extends Error {
  constructor(public httpStatus: 403 | 404, message: string) {
    super(message);
  }
}

// S-1 (user's answer): finance edits policies; everyone in the company can read them.
function requireFinance(actor: User) {
  if (actor.role !== "finance") throw new PolicyError(403, "only finance users can change spending policies");
}

export async function listPolicies(db: pg.PoolClient): Promise<SpendingPolicy[]> {
  const { rows } = await db.query<{ category: string; limit_cents: string; currency: string; updated_at: Date }>(
    "SELECT category, limit_cents::text, currency, updated_at FROM spending_policies ORDER BY category");
  return rows.map((r) => ({ category: r.category, limit: fromCents(r.limit_cents), currency: r.currency,
    updatedAt: r.updated_at.toISOString() }));
}

/** One policy per category (D-5): setting it again replaces it. */
export async function setPolicy(db: pg.PoolClient, actor: User, category: string, limitCents: number, currency: string) {
  requireFinance(actor);
  await db.query(
    `INSERT INTO spending_policies (category, limit_cents, currency, updated_by) VALUES ($1, $2, $3, $4)
     ON CONFLICT (company_id, category)
     DO UPDATE SET limit_cents = EXCLUDED.limit_cents, currency = EXCLUDED.currency,
                   updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [category, limitCents, currency, actor.id]);
}

/** Deleting a policy affects later expenses only; earlier warnings stay (AC-8, D-6). */
export async function deletePolicy(db: pg.PoolClient, actor: User, category: string) {
  requireFinance(actor);
  const { rowCount } = await db.query("DELETE FROM spending_policies WHERE category = $1", [category]);
  if (!rowCount) throw new PolicyError(404, "no policy for that category");
}

/**
 * The warning for a new expense, or null. Lenient by the sprint defaults: this
 * never refuses an expense. Over means strictly over: at the limit is fine (D-2).
 * A different currency can't be compared without exchange rates, so it gets its
 * own warning rather than silence (D-3).
 */
export async function policyWarning(db: pg.PoolClient, category: string, amountCents: number, currency: string) {
  const { rows } = await db.query<{ limit_cents: string; currency: string }>(
    "SELECT limit_cents::text, currency FROM spending_policies WHERE category = $1", [category]);
  const policy = rows[0];
  if (!policy) return null;
  const limit = `${fromCents(policy.limit_cents)} ${policy.currency}`;
  if (policy.currency !== currency) {
    return `The ${category} limit is ${limit}; this expense is in ${currency}, so it couldn't be checked.`;
  }
  return amountCents > Number(policy.limit_cents)
    ? `Over the ${category} limit of ${limit}.`
    : null;
}

import type pg from "pg";
import type { User } from "../auth/users.js";

export type Action = "approve" | "reject" | "pay";
export type Status = "submitted" | "approved" | "rejected" | "paid";

/** A refused transition, carrying the HTTP status the API should return. */
export class TransitionError extends Error {
  constructor(public httpStatus: 403 | 404 | 409, message: string) {
    super(message);
  }
}

const RULES: Record<Action, { role: User["role"]; from: Status; to: Status }> = {
  approve: { role: "approver", from: "submitted", to: "approved" },
  reject: { role: "approver", from: "submitted", to: "rejected" },
  pay: { role: "finance", from: "approved", to: "paid" },
};

/** Runs inside the caller's withCompany() transaction, so it only sees that company's rows. */
export async function transition(
  db: pg.PoolClient, expenseId: string, actor: User, action: Action,
): Promise<Status> {
  const rule = RULES[action];
  if (actor.role !== rule.role) {
    throw new TransitionError(403, `only ${rule.role} users can ${action} expenses`);
  }
  const { rows } = await db.query<{ status: Status; user_id: string | null }>(
    "SELECT status, user_id FROM expenses WHERE id = $1 FOR UPDATE", [expenseId]);
  const expense = rows[0];
  if (!expense) throw new TransitionError(404, "not found");
  if (action !== "pay" && expense.user_id === actor.id) {
    throw new TransitionError(403, "approvers can't decide their own expenses");
  }
  if (expense.status !== rule.from) {
    throw new TransitionError(409, `expense is ${expense.status}, not ${rule.from}`);
  }
  await db.query("UPDATE expenses SET status = $1 WHERE id = $2", [rule.to, expenseId]);
  await db.query(
    `INSERT INTO expense_events (expense_id, actor_id, from_status, to_status)
     VALUES ($1, $2, $3, $4)`, [expenseId, actor.id, rule.from, rule.to]);
  return rule.to;
}

export async function history(db: pg.PoolClient, expenseId: string) {
  const { rows } = await db.query(
    `SELECT actor_id AS "actorId", from_status AS "from", to_status AS "to", at
     FROM expense_events WHERE expense_id = $1 ORDER BY at, id`, [expenseId]);
  return rows;
}

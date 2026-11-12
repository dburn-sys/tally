import type pg from "pg";
import { fromCents } from "../money.js";

export const HEADER = ["date", "employee_email", "category", "merchant", "amount",
  "currency", "approver_email", "expense_id"] as const;

type Row = {
  spent_on: string; employee_email: string | null; category: string; description: string;
  amount_cents: string; currency: string; approver_email: string | null; id: string;
};

/**
 * One CSV field. A value starting with = + - @ tab or CR would run as a formula
 * when finance opens the file in a spreadsheet (CSV injection), so it gets a
 * leading apostrophe. Then RFC 4180 quoting for commas, quotes, and line breaks.
 */
export function field(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/**
 * Last calendar month's approved and paid expenses, in the company's time zone,
 * as CSV in the accounting import's column order (issue #12). Runs inside the
 * caller's withCompany() transaction.
 */
export async function approvedLastMonthCsv(db: pg.PoolClient, asOf: Date = new Date()): Promise<string> {
  const { rows } = await db.query<Row>(`
    WITH tz AS (
      SELECT time_zone FROM companies
      WHERE id = nullif(current_setting('tally.company_id', true), '')::uuid
    ), period AS (
      SELECT date_trunc('month', ($1::timestamptz AT TIME ZONE tz.time_zone) - interval '1 month')::date AS first,
             date_trunc('month', $1::timestamptz AT TIME ZONE tz.time_zone)::date AS next
      FROM tz
    )
    SELECT to_char(e.spent_on, 'YYYY-MM-DD') AS spent_on, u.email AS employee_email, e.category,
           e.description, e.amount_cents::text AS amount_cents, e.currency, a.email AS approver_email, e.id
    FROM expenses e
    CROSS JOIN period
    LEFT JOIN users u ON u.id = e.user_id
    LEFT JOIN LATERAL (
      SELECT ap.email FROM expense_events ev JOIN users ap ON ap.id = ev.actor_id
      WHERE ev.expense_id = e.id AND ev.to_status = 'approved'
      ORDER BY ev.at DESC LIMIT 1
    ) a ON true
    WHERE e.status IN ('approved', 'paid')
      AND e.spent_on >= period.first AND e.spent_on < period.next
    ORDER BY e.spent_on, e.id`, [asOf.toISOString()]);
  const lines = [HEADER.join(",")];
  for (const r of rows) {
    lines.push([r.spent_on, r.employee_email ?? "", r.category, r.description, fromCents(r.amount_cents),
      r.currency, r.approver_email ?? "", r.id].map(field).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { pool } from "../src/db.js";
import { adminPool } from "../scripts/admin-db.js";
import { createCompany } from "../src/auth/users.js";
import { signedInAs } from "./fixtures/auth.js";

const app = buildApp();
const body = { description: "Taxi", category: "travel", amount: "30.00", currency: "USD", spentOn: "2026-03-02" };
type Who = Awaited<ReturnType<typeof signedInAs>>;
let a: { employee: Who; approver: Who }, b: { employee: Who; approver: Who };
let bExpense: { id: string };

async function people(companyId: string) {
  return { employee: await signedInAs("employee", companyId), approver: await signedInAs("approver", companyId) };
}

beforeAll(async () => {
  await app.ready();
  a = await people(await createCompany("Company A"));
  b = await people(await createCompany("Company B"));
  await app.inject({ method: "POST", url: "/expenses", headers: a.employee.headers, payload: { ...body, amount: "10.00" } });
  bExpense = (await app.inject({ method: "POST", url: "/expenses", headers: b.employee.headers, payload: body })).json();
});
afterAll(async () => { await app.close(); await pool.end(); await adminPool.end(); });

describe("company isolation (ADR-0001)", () => {
  it("AC-1: lists and totals only the caller's company", async () => {
    const res = (await app.inject({ method: "GET", url: "/expenses", headers: a.approver.headers })).json();
    expect(res.expenses.map((e: { description: string }) => e.description)).toEqual(["Taxi"]);
    expect(res.expenses[0].userId).toBe(a.employee.user.id);
    expect(res.total).toBe("10.00");
  });
  it("AC-2: another company's expense is not found", async () => {
    const res = await app.inject({ method: "GET", url: `/expenses/${bExpense.id}`, headers: a.approver.headers });
    expect(res.statusCode).toBe(404);
  });
  it("AC-3: another company's expense can't be approved, and is unchanged", async () => {
    const res = await app.inject({ method: "POST", url: `/expenses/${bExpense.id}/approve`, headers: a.approver.headers });
    expect(res.statusCode).toBe(404);
    const { rows } = await adminPool.query("SELECT status FROM expenses WHERE id = $1", [bExpense.id]);
    expect(rows[0].status).toBe("submitted");
  });
  it("AC-4: another company's history is empty", async () => {
    await app.inject({ method: "POST", url: `/expenses/${bExpense.id}/approve`, headers: b.approver.headers });
    const res = await app.inject({ method: "GET", url: `/expenses/${bExpense.id}/history`, headers: a.approver.headers });
    expect(res.json()).toEqual([]);
  });
  it("AC-5: an API key acts within its own company only", async () => {
    const { key } = (await app.inject({ method: "POST", url: "/api-keys", headers: a.approver.headers })).json();
    const res = (await app.inject({ method: "GET", url: "/expenses", headers: { "x-api-key": key } })).json();
    expect(res.expenses).toHaveLength(1);
    expect(res.expenses[0].id).not.toBe(bExpense.id);
  });
  it("AC-6: the app role owns no tables, and every company table forces RLS", async () => {
    const owned = await pool.query(
      "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public' AND tableowner = current_user");
    expect(owned.rows[0].n).toBe(0);
    const role = await pool.query("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user");
    expect(role.rows[0]).toEqual({ rolsuper: false, rolbypassrls: false });
    const { rows } = await adminPool.query(
      `SELECT relname FROM pg_class WHERE relname = ANY($1) AND relrowsecurity AND relforcerowsecurity`,
      [["companies", "users", "api_keys", "expenses", "expense_events", "payouts", "webhook_events"]]);
    expect(rows.map((r) => r.relname).sort())
      .toEqual(["api_keys", "companies", "expense_events", "expenses", "payouts", "users", "webhook_events"]);
  });
  it("AC-7: with no company set, the app role sees nothing", async () => {
    for (const table of ["companies", "users", "api_keys", "expenses", "expense_events", "payouts", "webhook_events"]) {
      const { rows } = await pool.query(`SELECT count(*)::int AS n FROM ${table}`);
      expect(rows[0].n, table).toBe(0);
    }
  });
  it("AC-8: rows from before the migration belong to the default company", async () => {
    const { rows } = await adminPool.query(
      "SELECT name FROM companies WHERE id = '00000000-0000-0000-0000-000000000001'");
    expect(rows[0].name).toBe("Default company");
  });
});

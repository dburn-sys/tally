import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { pool } from "../src/db.js";
import { adminPool } from "../scripts/admin-db.js";
import { createCompany } from "../src/auth/users.js";
import { signedInAs } from "./fixtures/auth.js";

const app = buildApp();
type Who = Awaited<ReturnType<typeof signedInAs>>;
let employee: Who, approver: Who, finance: Who;

beforeAll(async () => {
  await app.ready();
  const company = await createCompany("Policies test");
  [employee, approver, finance] = await Promise.all(
    (["employee", "approver", "finance"] as const).map((r) => signedInAs(r, company)));
});
afterAll(async () => { await app.close(); await pool.end(); await adminPool.end(); });

const setPolicy = (who: Who, category: string, limit: string, currency = "USD") =>
  app.inject({ method: "PUT", url: `/policies/${category}`, headers: who.headers, payload: { limit, currency } });
const submit = async (who: Who, category: string, amount: string, currency = "USD") =>
  (await app.inject({ method: "POST", url: "/expenses", headers: who.headers,
    payload: { description: `${category} ${amount}`, category, amount, currency, spentOn: "2026-06-01" } })).json();

describe("spending policies (issue #30)", () => {
  it("AC-1: finance sets a policy, and setting it again replaces it", async () => {
    expect((await setPolicy(finance, "meals", "50.00")).statusCode).toBe(204);
    expect((await setPolicy(finance, "meals", "75.00")).statusCode).toBe(204);
    const list = (await app.inject({ method: "GET", url: "/policies", headers: finance.headers })).json();
    expect(list).toEqual([expect.objectContaining({ category: "meals", limit: "75.00", currency: "USD" })]);
  });

  it("AC-2: only finance can change policies", async () => {
    expect((await setPolicy(approver, "travel", "500.00")).statusCode).toBe(403);
    expect((await setPolicy(employee, "travel", "500.00")).statusCode).toBe(403);
    const del = await app.inject({ method: "DELETE", url: "/policies/meals", headers: approver.headers });
    expect(del.statusCode).toBe(403);
  });

  it("AC-3: everyone in the company can read the policies", async () => {
    const list = (await app.inject({ method: "GET", url: "/policies", headers: employee.headers })).json();
    expect(list.map((p: { category: string }) => p.category)).toEqual(["meals"]);
  });

  it("AC-4: an expense over the limit is saved, with a warning naming the limit", async () => {
    const e = await submit(employee, "meals", "80.00");
    expect(e.status).toBe("submitted");
    expect(e.policyWarning).toBe("Over the meals limit of 75.00 USD.");
  });

  it("AC-5: at or under the limit there's no warning", async () => {
    expect((await submit(employee, "meals", "75.00")).policyWarning).toBeNull();
    expect((await submit(employee, "meals", "12.00")).policyWarning).toBeNull();
    expect((await submit(employee, "travel", "9000.00")).policyWarning).toBeNull();   // no travel policy
  });

  it("D-3: a different currency gets a warning that it couldn't be checked", async () => {
    const e = await submit(employee, "meals", "80.00", "EUR");
    expect(e.policyWarning).toBe("The meals limit is 75.00 USD; this expense is in EUR, so it couldn't be checked.");
  });

  it("AC-6: approvers see the warning in the list and on the expense", async () => {
    const e = await submit(employee, "meals", "99.00");
    const one = (await app.inject({ method: "GET", url: `/expenses/${e.id}`, headers: approver.headers })).json();
    expect(one.policyWarning).toContain("Over the meals limit");
    const list = (await app.inject({ method: "GET", url: "/expenses?status=submitted", headers: approver.headers })).json();
    expect(list.expenses.find((x: { id: string }) => x.id === e.id).policyWarning).toContain("Over the meals limit");
  });

  it("AC-7: another company's policies are neither visible nor applied", async () => {
    const other = await createCompany("Other policies");
    const [oEmployee, oFinance] = await Promise.all([signedInAs("employee", other), signedInAs("finance", other)]);
    expect((await app.inject({ method: "GET", url: "/policies", headers: oFinance.headers })).json()).toEqual([]);
    expect((await submit(oEmployee, "meals", "500.00")).policyWarning).toBeNull();
  });

  it("AC-8: deleting a policy stops new warnings and keeps earlier ones", async () => {
    const before = await submit(employee, "meals", "120.00");
    expect((await app.inject({ method: "DELETE", url: "/policies/meals", headers: finance.headers })).statusCode).toBe(204);
    expect((await submit(employee, "meals", "120.00")).policyWarning).toBeNull();
    const again = (await app.inject({ method: "GET", url: `/expenses/${before.id}`, headers: approver.headers })).json();
    expect(again.policyWarning).toContain("Over the meals limit");
    expect((await app.inject({ method: "DELETE", url: "/policies/meals", headers: finance.headers })).statusCode).toBe(404);
  });

  it("rejects a bad limit, currency, or category", async () => {
    expect((await setPolicy(finance, "meals", "-5")).statusCode).toBe(400);
    expect((await setPolicy(finance, "meals", "10.00", "usd")).statusCode).toBe(400);
    expect((await setPolicy(finance, "parties", "10.00")).statusCode).toBe(400);
  });
});

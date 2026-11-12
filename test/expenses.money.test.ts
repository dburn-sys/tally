import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { pool } from "../src/db.js";
import { signedInAs } from "./fixtures/auth.js";

let headers: Record<string, string> = {};

const app = buildApp();
const base = { description: "Coffee", category: "meals", currency: "USD", spentOn: "2026-03-02" };
const post = (amount: string) =>
  app.inject({ headers, method: "POST", url: "/expenses", payload: { ...base, amount } });

beforeAll(async () => { await app.ready();
  ({ headers } = await signedInAs("approver")); await pool.query("TRUNCATE expenses CASCADE"); });
afterAll(async () => { await app.close(); await pool.end(); });

describe("money is stored exactly", () => {
  it('OB-1: "84.50" is stored as 8450 cents and returned as "84.50"', async () => {
    const res = await post("84.50");
    expect(res.statusCode).toBe(201);
    expect(res.json().amount).toBe("84.50");
    const { rows } = await pool.query("SELECT amount_cents FROM expenses WHERE id = $1", [res.json().id]);
    expect(rows[0].amount_cents).toBe("8450");
  });
  it('OB-2: "12.345" is rejected with 400', async () => {
    expect((await post("12.345")).statusCode).toBe(400);
  });
  it('OB-3: "abc" is rejected with 400', async () => {
    expect((await post("abc")).statusCode).toBe(400);
  });
  it('OB-4: the total of 0.10 and 0.20 is exactly "0.30"', async () => {
    await pool.query("TRUNCATE expenses CASCADE");
    await post("0.10");
    await post("0.20");
    const res = await app.inject({ headers, method: "GET", url: "/expenses" });
    expect(res.json().total).toBe("0.30");
  });
});

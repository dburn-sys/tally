import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { pool } from "../src/db.js";
import { adminPool } from "../scripts/admin-db.js";
import { signedInAs } from "./fixtures/auth.js";

let headers: Record<string, string> = {};

const app = buildApp();
const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const valid = { description: "Dinner", category: "meals", amount: "40", currency: "USD", spentOn: "2026-03-02" };
const post = (payload: object) => app.inject({ headers, method: "POST", url: "/expenses", payload });

beforeAll(async () => { await app.ready();
  ({ headers } = await signedInAs("approver")); });
afterAll(async () => { await app.close(); await pool.end(); await adminPool.end(); });

describe("expense categories and validation", () => {
  it("OB-1: creates an expense with a category", async () => {
    const res = await post(valid);
    expect(res.statusCode).toBe(201);
    expect(res.json().category).toBe("meals");
  });
  it("OB-2: rejects a missing category with 400", async () => {
    const { category, ...rest } = valid;
    expect((await post(rest)).statusCode).toBe(400);
  });
  it("OB-3: rejects an empty category with 400", async () => {
    expect((await post({ ...valid, category: "" })).statusCode).toBe(400);
  });
  it("OB-4: rejects a category not in the list with 400", async () => {
    expect((await post({ ...valid, category: "snacks" })).statusCode).toBe(400);
  });
  it("OB-5: rejects an amount of 0 with 400", async () => {
    expect((await post({ ...valid, amount: "0" })).statusCode).toBe(400);
  });
  it("OB-6: rejects a negative amount with 400", async () => {
    expect((await post({ ...valid, amount: "-5" })).statusCode).toBe(400);
  });
  it("OB-7: rejects a spentOn date in the future with 400", async () => {
    expect((await post({ ...valid, spentOn: tomorrow })).statusCode).toBe(400);
  });
  it("OB-8: accepts a spentOn date of today", async () => {
    expect((await post({ ...valid, spentOn: today })).statusCode).toBe(201);
  });
  it("OB-9: lists expenses with their category", async () => {
    const res = await app.inject({ headers, method: "GET", url: "/expenses" });
    expect(res.json().expenses.every((e: { category?: string }) => typeof e.category === "string")).toBe(true);
  });
});

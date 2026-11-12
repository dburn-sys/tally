import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { pool } from "../src/db.js";
import { adminPool } from "../scripts/admin-db.js";
import { signedInAs } from "./fixtures/auth.js";

let headers: Record<string, string> = {};

const app = buildApp();

beforeAll(async () => {
  await app.ready();
  ({ headers } = await signedInAs("approver"));
  await adminPool.query("TRUNCATE expenses CASCADE");
});
afterAll(async () => {
  await app.close();
  await pool.end(); await adminPool.end();
});

describe("POST /expenses", () => {
  it("creates an expense", async () => {
    const res = await app.inject({
      headers,
      method: "POST",
      url: "/expenses",
      payload: { description: "Team lunch", category: "meals", amount: "84.50", currency: "USD", spentOn: "2026-03-02" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().description).toBe("Team lunch");
  });

  it("rejects a missing description", async () => {
    const res = await app.inject({
      headers,
      method: "POST",
      url: "/expenses",
      payload: { category: "meals", amount: "12", currency: "USD", spentOn: "2026-03-02" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("GET /expenses", () => {
  it("lists expenses newest first", async () => {
    await app.inject({ headers, method: "POST", url: "/expenses",
      payload: { description: "Taxi", category: "travel", amount: "20", currency: "USD", spentOn: "2026-03-03" } });
    const res = await app.inject({ headers, method: "GET", url: "/expenses" });
    expect(res.statusCode).toBe(200);
    expect(res.json().expenses[0].description).toBe("Taxi");
  });
});

describe("GET /expenses/:id", () => {
  it("returns 404 for an unknown id", async () => {
    const res = await app.inject({ headers, method: "GET", url: "/expenses/00000000-0000-0000-0000-000000000000" });
    expect(res.statusCode).toBe(404);
  });

  it("returns 400 for an id that isn't a UUID", async () => {
    const res = await app.inject({ headers, method: "GET", url: "/expenses/not-a-uuid" });
    expect(res.statusCode).toBe(400);
  });
});

describe("GET /expenses?status=", () => {
  it("AC-6: returns only expenses in that status", async () => {
    const created = await app.inject({ headers, method: "POST", url: "/expenses",
      payload: { description: "Status filter", category: "other", amount: "1.00", currency: "USD", spentOn: "2026-03-02" } });
    expect(created.statusCode).toBe(201);
    const submitted = (await app.inject({ headers, method: "GET", url: "/expenses?status=submitted" })).json();
    expect(submitted.expenses.length).toBeGreaterThan(0);
    expect(submitted.expenses.every((e: { status: string }) => e.status === "submitted")).toBe(true);
    const paid = (await app.inject({ headers, method: "GET", url: "/expenses?status=paid" })).json();
    expect(paid.expenses.map((e: { id: string }) => e.id)).not.toContain(created.json().id);
  });
  it("AC-6: an unknown status is 400", async () => {
    const res = await app.inject({ headers, method: "GET", url: "/expenses?status=lost" });
    expect(res.statusCode).toBe(400);
  });
});

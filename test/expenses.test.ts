import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { pool } from "../src/db.js";
import { signedInAs } from "./fixtures/auth.js";

let headers: Record<string, string> = {};

const app = buildApp();

beforeAll(async () => {
  await app.ready();
  ({ headers } = await signedInAs("approver"));
  await pool.query("TRUNCATE expenses CASCADE");
});
afterAll(async () => {
  await app.close();
  await pool.end();
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

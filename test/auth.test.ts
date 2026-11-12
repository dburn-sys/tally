import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { pool } from "../src/db.js";
import { adminPool } from "../scripts/admin-db.js";
import { createUser } from "../src/auth/users.js";
import { createSessionToken, verifySessionToken, SESSION_SECONDS } from "../src/auth/session.js";
import { signedInAs, testCompany } from "./fixtures/auth.js";
import { randomUUID } from "node:crypto";

const app = buildApp();
const email = `ada-${randomUUID()}@example.com`;
const expense = { description: "Lunch", category: "meals", amount: "15.00", currency: "USD", spentOn: "2026-03-02" };

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); await pool.end(); await adminPool.end(); });

describe("authentication", () => {
  it("OB-1: login with the right password returns a session token", async () => {
    await createUser(await testCompany(), email, "s3cret-pass", "employee");
    const res = await app.inject({ method: "POST", url: "/login", payload: { email: email, password: "s3cret-pass" } });
    expect(res.statusCode).toBe(200);
    expect(verifySessionToken(res.json().token)).not.toBeNull();
  });
  it("OB-2: login with the wrong password returns 401", async () => {
    const res = await app.inject({ method: "POST", url: "/login", payload: { email: email, password: "nope" } });
    expect(res.statusCode).toBe(401);
  });
  it("OB-3: expense routes without credentials return 401", async () => {
    expect((await app.inject({ method: "GET", url: "/expenses" })).statusCode).toBe(401);
  });
  it("OB-4: a tampered token is rejected", async () => {
    const { user } = await signedInAs("employee");
    const token = createSessionToken(user.id).slice(0, -2) + "xx";
    const res = await app.inject({ method: "GET", url: "/expenses", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(401);
  });
  it("OB-5: an expired token is rejected", async () => {
    const { user } = await signedInAs("employee");
    const old = createSessionToken(user.id, Date.now() - (SESSION_SECONDS + 60) * 1000);
    expect(verifySessionToken(old)).toBeNull();
  });
});

describe("roles and API keys", () => {
  it("OB-6: employees see only their own expenses", async () => {
    const a = await signedInAs("employee");
    const b = await signedInAs("employee");
    await app.inject({ method: "POST", url: "/expenses", headers: a.headers, payload: expense });
    const res = await app.inject({ method: "GET", url: "/expenses", headers: b.headers });
    expect(res.json().expenses.every((e: { userId: string }) => e.userId === b.user.id)).toBe(true);
  });
  it("OB-7: an API key authenticates as its owner", async () => {
    const { headers } = await signedInAs("finance");
    const created = await app.inject({ method: "POST", url: "/api-keys", headers });
    expect(created.statusCode).toBe(201);
    const res = await app.inject({ method: "GET", url: "/expenses", headers: { "x-api-key": created.json().key } });
    expect(res.statusCode).toBe(200);
  });
  it("OB-8: only a hash of the API key is stored", async () => {
    const { headers } = await signedInAs("finance");
    const { key } = (await app.inject({ method: "POST", url: "/api-keys", headers })).json();
    const { rows } = await adminPool.query("SELECT count(*)::int AS n FROM api_keys WHERE key_hash = $1", [key]);
    expect(rows[0].n).toBe(0);
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { pool } from "../src/db.js";
import { adminPool } from "../scripts/admin-db.js";
import { signedInAs } from "./fixtures/auth.js";

// Regression for "managers keep approving their own expenses through the
// integration API" (Chapter 15). AC-4 forbids self-approval; the API key path
// must enforce it exactly as the session path does.
const app = buildApp();
const body = { description: "Conference", category: "travel", amount: "450.00", currency: "USD", spentOn: "2026-03-02" };
type Who = Awaited<ReturnType<typeof signedInAs>>;
let approver: Who, employee: Who, approverKey: { "x-api-key": string };

beforeAll(async () => {
  await app.ready();
  [approver, employee] = await Promise.all([signedInAs("approver"), signedInAs("employee")]);
  const { key } = (await app.inject({ method: "POST", url: "/api-keys", headers: approver.headers })).json();
  approverKey = { "x-api-key": key };
});
afterAll(async () => { await app.close(); await pool.end(); await adminPool.end(); });

async function submit(headers: Record<string, string>) {
  return (await app.inject({ method: "POST", url: "/expenses", headers, payload: body })).json();
}

describe("approvals through an API key", () => {
  it("OB-1 (regression): an approver can't approve their own expense with an API key", async () => {
    const e = await submit(approverKey);
    const res = await app.inject({ method: "POST", url: `/expenses/${e.id}/approve`, headers: approverKey });
    expect(res.statusCode).toBe(403);
    const { rows } = await adminPool.query("SELECT status FROM expenses WHERE id = $1", [e.id]);
    expect(rows[0].status).toBe("submitted");
  });
  it("OB-1 (regression): nor one they submitted in a session and approve with a key", async () => {
    const e = await submit(approver.headers);
    const res = await app.inject({ method: "POST", url: `/expenses/${e.id}/approve`, headers: approverKey });
    expect(res.statusCode).toBe(403);
  });
  it("OB-2: an approver can approve someone else's expense with an API key", async () => {
    const e = await submit(employee.headers);
    const res = await app.inject({ method: "POST", url: `/expenses/${e.id}/approve`, headers: approverKey });
    expect(res.statusCode).toBe(200);
    const history = (await app.inject({ method: "GET", url: `/expenses/${e.id}/history`, headers: approverKey })).json();
    expect(history[0].actorId).toBe(approver.user.id);
  });
  it("a key and a session for the same person resolve to the same user", async () => {
    const viaKey = (await app.inject({ method: "GET", url: "/expenses", headers: approverKey })).json();
    const viaSession = (await app.inject({ method: "GET", url: "/expenses", headers: approver.headers })).json();
    expect(viaKey).toEqual(viaSession);
  });
});

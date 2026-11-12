import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { pool } from "../src/db.js";
import { signedInAs } from "./fixtures/auth.js";

const app = buildApp();
const body = { description: "Hotel", category: "lodging", amount: "120.00", currency: "USD", spentOn: "2026-03-02" };
type Who = Awaited<ReturnType<typeof signedInAs>>;
let employee: Who, approver: Who, otherApprover: Who, finance: Who;

async function submit(as: Who) {
  return (await app.inject({ method: "POST", url: "/expenses", headers: as.headers, payload: body })).json();
}
async function act(id: string, action: string, as: Who) {
  return app.inject({ method: "POST", url: `/expenses/${id}/${action}`, headers: as.headers });
}

beforeAll(async () => {
  await app.ready();
  [employee, approver, otherApprover, finance] = await Promise.all(
    (["employee", "approver", "approver", "finance"] as const).map((r) => signedInAs(r)));
});
afterAll(async () => { await app.close(); await pool.end(); });

describe("approval workflow", () => {
  it("AC-1: new expenses are submitted", async () => {
    expect((await submit(employee)).status).toBe("submitted");
  });
  it("AC-2: an approver approves a submitted expense", async () => {
    const e = await submit(employee);
    const res = await act(e.id, "approve", approver);
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("approved");
  });
  it("AC-3: an approver rejects a submitted expense", async () => {
    const e = await submit(employee);
    expect((await act(e.id, "reject", approver)).json().status).toBe("rejected");
  });
  it("AC-4: an approver can't approve their own expense", async () => {
    const e = await submit(approver);
    expect((await act(e.id, "approve", approver)).statusCode).toBe(403);
    expect((await act(e.id, "approve", otherApprover)).statusCode).toBe(200);
  });
  it("AC-5: employees and finance can't approve", async () => {
    const e = await submit(employee);
    expect((await act(e.id, "approve", employee)).statusCode).toBe(403);
    expect((await act(e.id, "approve", finance)).statusCode).toBe(403);
  });
  it("AC-6: finance marks an approved expense paid", async () => {
    const e = await submit(employee);
    await act(e.id, "approve", approver);
    expect((await act(e.id, "pay", finance)).json().status).toBe("paid");
  });
  it("AC-7: finance can't pay an expense that isn't approved", async () => {
    const e = await submit(employee);
    expect((await act(e.id, "pay", finance)).statusCode).toBe(409);
  });
  it("AC-8: a decided expense can't be decided again", async () => {
    const e = await submit(employee);
    await act(e.id, "reject", approver);
    expect((await act(e.id, "approve", otherApprover)).statusCode).toBe(409);
  });
  it("AC-9: history records who changed what, and when", async () => {
    const e = await submit(employee);
    await act(e.id, "approve", approver);
    await act(e.id, "pay", finance);
    const res = await app.inject({ method: "GET", url: `/expenses/${e.id}/history`, headers: approver.headers });
    expect(res.json().map((h: { from: string; to: string }) => `${h.from}->${h.to}`))
      .toEqual(["submitted->approved", "approved->paid"]);
    expect(res.json()[0].actorId).toBe(approver.user.id);
  });
  it("AC-10: an expense from a submitter who has left can still be decided", async () => {
    const e = await submit(employee);
    // "Left" means the account can no longer sign in; the expense and its submitter remain.
    await pool.query("UPDATE users SET password_hash = 'disabled' WHERE id = $1", [employee.user.id]);
    expect((await act(e.id, "approve", approver)).statusCode).toBe(200);
  });
});

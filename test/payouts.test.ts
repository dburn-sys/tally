import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApp } from "../src/app.js";
import { pool } from "../src/db.js";
import { adminPool } from "../scripts/admin-db.js";
import { signedInAs } from "./fixtures/auth.js";
import { fakeProvider, signedWebhook, WEBHOOK_SECRET } from "./fixtures/payouts.js";

const provider = fakeProvider();
const app = buildApp({ provider, webhookSecret: WEBHOOK_SECRET });
type Who = Awaited<ReturnType<typeof signedInAs>>;
let employee: Who, approver: Who, finance: Who;

beforeAll(async () => {
  await app.ready();
  [employee, approver, finance] = await Promise.all([signedInAs("employee"), signedInAs("approver"), signedInAs("finance")]);
});
afterAll(async () => { await app.close(); await pool.end(); await adminPool.end(); });

async function approvedExpense(amount = "120.00") {
  const e = (await app.inject({ method: "POST", url: "/expenses", headers: employee.headers,
    payload: { description: "Flight", category: "travel", amount, currency: "EUR", spentOn: "2026-03-02" } })).json();
  await app.inject({ method: "POST", url: `/expenses/${e.id}/approve`, headers: approver.headers });
  return e.id as string;
}
async function startPayout(expenseId: string, who: Who = finance) {
  return app.inject({ method: "POST", url: `/expenses/${expenseId}/payout`, headers: who.headers });
}
async function row(sql: string, id: string) {
  return (await adminPool.query(sql, [id])).rows[0];
}
const payoutStatus = (id: string) => row("SELECT status FROM payouts WHERE id = $1", id).then((r) => r.status);
const expenseStatus = (id: string) => row("SELECT status FROM expenses WHERE id = $1", id).then((r) => r.status);
const event = (payoutId: string, status = "paid", id = `evt_${randomUUID()}`) =>
  ({ id, payoutId, companyId: finance.user.companyId, status });

describe("starting a payout", () => {
  it("AC-1: pays the expense's own amount and currency, and returns 202", async () => {
    const id = await approvedExpense("120.00");
    const res = await startPayout(id);
    expect(res.statusCode).toBe(202);
    expect(provider.calls.at(-1)).toEqual({
      payoutId: res.json().payoutId, companyId: finance.user.companyId, amountCents: 12000, currency: "EUR" });
    expect(await payoutStatus(res.json().payoutId)).toBe("pending");
  });
  it("AC-2: an expense that isn't approved is refused with 409, and the provider isn't called", async () => {
    const e = (await app.inject({ method: "POST", url: "/expenses", headers: employee.headers,
      payload: { description: "Taxi", category: "travel", amount: "9.00", currency: "EUR", spentOn: "2026-03-02" } })).json();
    const before = provider.calls.length;
    expect((await startPayout(e.id)).statusCode).toBe(409);
    expect(provider.calls.length).toBe(before);
  });
  it("AC-3: only finance can start a payout", async () => {
    const id = await approvedExpense();
    expect((await startPayout(id, approver)).statusCode).toBe(403);
    expect((await startPayout(id, employee)).statusCode).toBe(403);
  });
  it("AC-4: a second payout for the same expense is refused with 409", async () => {
    const id = await approvedExpense();
    expect((await startPayout(id)).statusCode).toBe(202);
    expect((await startPayout(id)).statusCode).toBe(409);
  });
  it("AC-5: a provider error fails the payout with 502, and finance can try again", async () => {
    const id = await approvedExpense();
    provider.failNext();
    const failed = await startPayout(id);
    expect(failed.statusCode).toBe(502);
    const { rows } = await adminPool.query("SELECT status FROM payouts WHERE expense_id = $1", [id]);
    expect(rows.map((r) => r.status)).toEqual(["failed"]);
    expect((await startPayout(id)).statusCode).toBe(202);
  });
  it("an unknown expense is 404", async () => {
    expect((await startPayout(randomUUID())).statusCode).toBe(404);
  });
});

describe("the payout webhook", () => {
  async function pendingPayout() {
    const expenseId = await approvedExpense();
    return { expenseId, payoutId: (await startPayout(expenseId)).json().payoutId as string };
  }

  it("AC-6: a missing or wrong signature is refused with 401, and nothing changes", async () => {
    const { payoutId } = await pendingPayout();
    const forged = signedWebhook(event(payoutId), { secret: "not-the-secret" });
    expect((await app.inject(forged)).statusCode).toBe(401);
    const unsigned = signedWebhook(event(payoutId));
    delete (unsigned.headers as Record<string, string>)["payrail-signature"];
    expect((await app.inject(unsigned)).statusCode).toBe(401);
    const tampered = signedWebhook(event(payoutId, "failed"));
    tampered.payload = tampered.payload.replace('"failed"', '"paid"');
    expect((await app.inject(tampered)).statusCode).toBe(401);
    expect(await payoutStatus(payoutId)).toBe("pending");
  });
  it("AC-7: a correctly signed event more than 5 minutes old is refused", async () => {
    const { payoutId } = await pendingPayout();
    const old = signedWebhook(event(payoutId), { t: Math.floor(Date.now() / 1000) - 301 });
    expect((await app.inject(old)).statusCode).toBe(401);
    expect(await payoutStatus(payoutId)).toBe("pending");
  });
  it("AC-8: paid marks the payout and expense paid, with the finance user in the history", async () => {
    const { expenseId, payoutId } = await pendingPayout();
    const res = await app.inject(signedWebhook(event(payoutId)));
    expect(res.json()).toEqual({ received: true, duplicate: false });
    expect(await payoutStatus(payoutId)).toBe("paid");
    expect(await expenseStatus(expenseId)).toBe("paid");
    const history = (await app.inject({ method: "GET", url: `/expenses/${expenseId}/history`, headers: finance.headers })).json();
    expect(history.at(-1)).toMatchObject({ from: "approved", to: "paid", actorId: finance.user.id });
  });
  it("AC-9: the same event twice, at the same moment, has effect once", async () => {
    const { expenseId, payoutId } = await pendingPayout();
    const req = signedWebhook(event(payoutId));
    const results = await Promise.all(Array.from({ length: 5 }, () => app.inject(req)));
    expect(results.map((r) => r.json().duplicate).sort()).toEqual([false, true, true, true, true]);
    const paidEvents = await adminPool.query(
      "SELECT count(*)::int AS n FROM expense_events WHERE expense_id = $1 AND to_status = 'paid'", [expenseId]);
    expect(paidEvents.rows[0].n).toBe(1);
  });
  it("AC-10: failed fails the payout and leaves the expense approved", async () => {
    const { expenseId, payoutId } = await pendingPayout();
    await app.inject(signedWebhook(event(payoutId, "failed")));
    expect(await payoutStatus(payoutId)).toBe("failed");
    expect(await expenseStatus(expenseId)).toBe("approved");
  });
  it("AC-11: an event for a payout that isn't pending changes nothing", async () => {
    const { expenseId, payoutId } = await pendingPayout();
    await app.inject(signedWebhook(event(payoutId, "paid")));
    const late = await app.inject(signedWebhook(event(payoutId, "failed")));
    expect(late.json()).toEqual({ received: true, duplicate: false });
    expect(await payoutStatus(payoutId)).toBe("paid");
    expect(await expenseStatus(expenseId)).toBe("paid");
  });
  it("AC-12: the amount in the event is ignored", async () => {
    const { expenseId, payoutId } = await pendingPayout();
    await app.inject(signedWebhook({ ...event(payoutId), amount: 1 }));
    expect(await row("SELECT amount_cents FROM payouts WHERE id = $1", payoutId)).toEqual({ amount_cents: "12000" });
    expect(await expenseStatus(expenseId)).toBe("paid");
  });
  it("an event naming another company finds nothing there", async () => {
    const { payoutId } = await pendingPayout();
    const other = await signedInAs("finance", (await import("../src/auth/users.js").then((m) => m.createCompany("Other"))));
    const res = await app.inject(signedWebhook({ ...event(payoutId), companyId: other.user.companyId }));
    expect(res.statusCode).toBe(404);
    expect(await payoutStatus(payoutId)).toBe("pending");
  });
});

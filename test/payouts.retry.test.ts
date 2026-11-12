import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { pool } from "../src/db.js";
import { adminPool } from "../scripts/admin-db.js";
import { PayrailProvider, ProviderError } from "../src/payouts/provider.js";
import { withRetries } from "../src/payouts/retry.js";
import { signedInAs } from "./fixtures/auth.js";
import { fakeProvider, NO_WAIT, signedWebhook, WEBHOOK_SECRET } from "./fixtures/payouts.js";

const provider = fakeProvider();
const app = buildApp({ provider, webhookSecret: WEBHOOK_SECRET, payoutRetry: NO_WAIT });
type Who = Awaited<ReturnType<typeof signedInAs>>;
let employee: Who, approver: Who, finance: Who;

beforeAll(async () => {
  await app.ready();
  [employee, approver, finance] = await Promise.all([signedInAs("employee"), signedInAs("approver"), signedInAs("finance")]);
});
afterAll(async () => { await app.close(); await pool.end(); await adminPool.end(); });

async function approvedExpense() {
  const e = (await app.inject({ method: "POST", url: "/expenses", headers: employee.headers,
    payload: { description: "Train", category: "travel", amount: "64.00", currency: "GBP", spentOn: "2026-03-02" } })).json();
  await app.inject({ method: "POST", url: `/expenses/${e.id}/approve`, headers: approver.headers });
  return e.id as string;
}
const pay = (id: string) => app.inject({ method: "POST", url: `/expenses/${id}/payout`, headers: finance.headers });
const payoutsFor = async (expenseId: string) =>
  (await adminPool.query("SELECT id, status FROM payouts WHERE expense_id = $1", [expenseId])).rows;

describe("payout retries", () => {
  it("AC-7, AC-10: transient errors are retried with the same payout id, and it's paid once", async () => {
    const id = await approvedExpense();
    const before = provider.calls.length;
    provider.failNext("unknown", "unknown");
    const res = await pay(id);
    expect(res.statusCode).toBe(202);
    expect(res.json().outcome).toBe("submitted");
    const attempts = provider.calls.slice(before);
    expect(attempts).toHaveLength(3);
    expect(new Set(attempts.map((c) => c.payoutId)).size).toBe(1);
    expect(await payoutsFor(id)).toHaveLength(1);
  });

  it("AC-8: a refusal is not retried; the payout fails with 502", async () => {
    const id = await approvedExpense();
    const before = provider.calls.length;
    provider.failNext("refused");
    expect((await pay(id)).statusCode).toBe(502);
    expect(provider.calls.length - before).toBe(1);
    expect((await payoutsFor(id)).map((p) => p.status)).toEqual(["failed"]);
  });

  it("AC-9: when every attempt is transient, the payout stays pending and can't be started again", async () => {
    const id = await approvedExpense();
    const before = provider.calls.length;
    provider.failNext("unknown", "unknown", "unknown", "unknown");
    const res = await pay(id);
    expect(res.statusCode).toBe(202);
    expect(res.json()).toMatchObject({ status: "pending", outcome: "unknown" });
    expect(provider.calls.length - before).toBe(4);
    expect((await payoutsFor(id)).map((p) => p.status)).toEqual(["pending"]);
    expect((await pay(id)).statusCode).toBe(409);   // no second payout: that's how double-paying happens
  });

  it("AC-9: the webhook settles an unknown outcome", async () => {
    const id = await approvedExpense();
    provider.failNext("unknown", "unknown", "unknown", "unknown");
    const { payoutId } = (await pay(id)).json();
    await app.inject(signedWebhook({ id: `evt_${payoutId}`, payoutId, companyId: finance.user.companyId, status: "paid" }));
    expect((await payoutsFor(id)).map((p) => p.status)).toEqual(["paid"]);
  });
});

describe("withRetries", () => {
  it("backs off exponentially", async () => {
    const waits: number[] = [];
    const fail = async () => { throw new ProviderError("timeout", "unknown"); };
    await expect(withRetries(fail, { retries: 3, baseMs: 100, sleep: async (ms) => { waits.push(ms); } }))
      .rejects.toThrow("timeout");
    expect(waits).toEqual([100, 200, 400]);
  });
});

describe("Payrail responses", () => {
  async function outcomeOf(response: () => Promise<Response>) {
    const realFetch = globalThis.fetch;
    globalThis.fetch = response as typeof fetch;
    try {
      await new PayrailProvider("k", "http://payrail.invalid").createPayout(
        { payoutId: "p", companyId: "c", amountCents: 100, currency: "USD" });
      return "ok";
    } catch (err) {
      return (err as ProviderError).outcome;
    } finally {
      globalThis.fetch = realFetch;
    }
  }
  it.each([
    [429, "unknown"], [500, "unknown"], [503, "unknown"], [400, "refused"], [402, "refused"], [422, "refused"],
  ])("HTTP %i is %s", async (status, outcome) => {
    expect(await outcomeOf(async () => new Response("{}", { status }))).toBe(outcome);
  });
  it("a network error or timeout is unknown", async () => {
    expect(await outcomeOf(async () => { throw new TypeError("fetch failed"); })).toBe("unknown");
  });
  it("a 200 with no id is unknown, not success", async () => {
    expect(await outcomeOf(async () => new Response("{}", { status: 200 }))).toBe("unknown");
  });
  it("a 200 with an id is success", async () => {
    expect(await outcomeOf(async () => Response.json({ id: "po_1" }))).toBe("ok");
  });
});

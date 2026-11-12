import { randomBytes } from "node:crypto";
import { signPayload } from "../../src/webhooks/signature.js";
import type { PaymentProvider, PayoutRequest } from "../../src/payouts/provider.js";

export const WEBHOOK_SECRET = randomBytes(32).toString("hex");

/** A provider that records what it was asked to pay, and can be told to fail. */
export function fakeProvider() {
  const calls: PayoutRequest[] = [];
  let fail = false;
  const provider: PaymentProvider & { calls: PayoutRequest[]; failNext(): void } = {
    calls,
    failNext() { fail = true; },
    async createPayout(req) {
      calls.push(req);
      if (fail) { fail = false; throw new Error("sandbox: card declined"); }
      return { providerRef: `po_${calls.length}` };
    },
  };
  return provider;
}

type Event = { id: string; payoutId: string; companyId: string; status: string; amount?: number };

/** A webhook request signed exactly as the provider signs it. */
export function signedWebhook(e: Event, opts: { secret?: string; t?: number } = {}) {
  const payload = JSON.stringify({
    id: e.id, status: e.status, amount: e.amount ?? 1,
    metadata: { payoutId: e.payoutId, companyId: e.companyId },
  });
  return {
    method: "POST" as const,
    url: "/webhooks/payrail",
    headers: {
      "content-type": "application/json",
      "payrail-signature": signPayload(payload, opts.secret ?? WEBHOOK_SECRET, opts.t),
    },
    payload,
  };
}

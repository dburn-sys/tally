import { randomBytes } from "node:crypto";
import { signPayload } from "../../src/webhooks/signature.js";
import { ProviderError, type PaymentProvider, type PayoutRequest } from "../../src/payouts/provider.js";

export const WEBHOOK_SECRET = randomBytes(32).toString("hex");

type Outcome = "refused" | "unknown";

/** A provider that records what it was asked to pay, and can be told how the next calls go. */
export function fakeProvider() {
  const calls: PayoutRequest[] = [];
  const queue: Outcome[] = [];
  const provider: PaymentProvider & { calls: PayoutRequest[]; failNext(...outcomes: Outcome[]): void } = {
    calls,
    failNext(...outcomes) { queue.push(...(outcomes.length ? outcomes : ["refused" as const])); },
    async createPayout(req) {
      calls.push(req);
      const outcome = queue.shift();
      if (outcome === "refused") throw new ProviderError("sandbox: card declined", "refused");
      if (outcome === "unknown") throw new ProviderError("sandbox: timed out", "unknown");
      return { providerRef: `po_${calls.length}` };
    },
  };
  return provider;
}

/** Retries without waiting, for tests. */
export const NO_WAIT = { retries: 3, baseMs: 0, sleep: async () => {} };

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

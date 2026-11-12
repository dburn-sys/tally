/** The payment provider, behind an interface so tests and other providers can swap in. */
export type PayoutRequest = {
  payoutId: string;
  companyId: string;
  amountCents: number;
  currency: string;
};

export interface PaymentProvider {
  /** Ask the provider to pay. Returns the provider's reference. Throws on failure. */
  createPayout(req: PayoutRequest): Promise<{ providerRef: string }>;
}

export class ProviderError extends Error {}

/**
 * Payrail's sandbox and live APIs. payoutId and companyId go in the metadata,
 * and come back in the signed webhook, so the webhook can find our own record.
 */
export class PayrailProvider implements PaymentProvider {
  constructor(private readonly apiKey: string, private readonly baseUrl: string) {}

  async createPayout(req: PayoutRequest): Promise<{ providerRef: string }> {
    const res = await fetch(`${this.baseUrl}/v1/payouts`, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
        "idempotency-key": req.payoutId,     // a retried request can't pay twice
      },
      body: JSON.stringify({
        amount: req.amountCents,
        currency: req.currency,
        metadata: { payoutId: req.payoutId, companyId: req.companyId },
      }),
    });
    if (!res.ok) throw new ProviderError(`provider returned ${res.status}`);
    const body: unknown = await res.json();
    const id = (body as { id?: unknown }).id;
    if (typeof id !== "string") throw new ProviderError("provider reply had no id");
    return { providerRef: id };
  }
}

export const unconfiguredProvider: PaymentProvider = {
  async createPayout() {
    throw new ProviderError("no payment provider configured");
  },
};

export function providerFromEnv(): PaymentProvider {
  const key = process.env.PAYRAIL_API_KEY;
  if (!key) return unconfiguredProvider;
  return new PayrailProvider(key, process.env.PAYRAIL_API_URL ?? "https://sandbox.payrail.example");
}

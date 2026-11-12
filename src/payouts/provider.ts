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

/**
 * "refused": the provider said no; nothing was paid, and trying again won't help.
 * "unknown": a timeout, network error, 429, or 5xx. The payment may or may not
 * have gone through, so the only safe retry reuses the same idempotency key.
 */
export class ProviderError extends Error {
  constructor(message: string, public readonly outcome: "refused" | "unknown", options?: ErrorOptions) {
    super(message, options);
  }
}

/**
 * Payrail's sandbox and live APIs. payoutId and companyId go in the metadata,
 * and come back in the signed webhook, so the webhook can find our own record.
 */
export class PayrailProvider implements PaymentProvider {
  constructor(private readonly apiKey: string, private readonly baseUrl: string) {}

  async createPayout(req: PayoutRequest): Promise<{ providerRef: string }> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/v1/payouts`, {
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
    } catch (err) {
      throw new ProviderError("provider unreachable or timed out", "unknown", { cause: err });
    }
    if (res.status === 429 || res.status >= 500) throw new ProviderError(`provider returned ${res.status}`, "unknown");
    if (!res.ok) throw new ProviderError(`provider refused the payout: ${res.status}`, "refused");
    const body: unknown = await res.json().catch(() => null);
    const id = (body as { id?: unknown } | null)?.id;
    if (typeof id !== "string") throw new ProviderError("provider reply had no id", "unknown");
    return { providerRef: id };
  }
}

export const unconfiguredProvider: PaymentProvider = {
  async createPayout() {
    throw new ProviderError("no payment provider configured", "refused");
  },
};

export function providerFromEnv(): PaymentProvider {
  const key = process.env.PAYRAIL_API_KEY;
  if (!key) return unconfiguredProvider;
  return new PayrailProvider(key, process.env.PAYRAIL_API_URL ?? "https://sandbox.payrail.example");
}

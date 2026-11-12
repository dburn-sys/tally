import { ProviderError } from "./provider.js";

export type RetryOptions = {
  /** Extra attempts after the first. */
  retries: number;
  /** Delay before the first retry; each retry doubles it. */
  baseMs: number;
  sleep?: (ms: number) => Promise<void>;
};

export const DEFAULT_RETRY: RetryOptions = { retries: 3, baseMs: 250 };

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Run fn, retrying only when the outcome is unknown. fn MUST be idempotent:
 * for payouts, every attempt sends the same payout id as the idempotency key,
 * so the provider pays at most once however many attempts reach it.
 * A refusal is final and is thrown at once.
 */
export async function withRetries<T>(fn: () => Promise<T>, options: RetryOptions = DEFAULT_RETRY): Promise<T> {
  const sleep = options.sleep ?? realSleep;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const unknown = !(err instanceof ProviderError) || err.outcome === "unknown";
      if (!unknown || attempt >= options.retries) throw err;
      await sleep(options.baseMs * 2 ** attempt);
    }
  }
}

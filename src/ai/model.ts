/** The one place Tally talks to a model. Everything else depends on ModelClient. */
export type CompleteOptions = { timeoutMs: number; maxRetries: number };

export interface ModelClient {
  complete(prompt: string, options: CompleteOptions): Promise<string>;
}

export class ModelUnavailable extends Error {}

/** Calls the Anthropic Messages API over HTTPS. No SDK, so no new dependency. */
export class AnthropicClient implements ModelClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly url = "https://api.anthropic.com/v1/messages",
  ) {}

  async complete(prompt: string, { timeoutMs, maxRetries }: CompleteOptions): Promise<string> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(this.url, {
          method: "POST",
          signal: AbortSignal.timeout(timeoutMs),
          headers: {
            "content-type": "application/json",
            "x-api-key": this.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({ model: this.model, max_tokens: 512, messages: [{ role: "user", content: prompt }] }),
        });
        if (res.status === 429 || res.status >= 500) throw new ModelUnavailable(`model returned ${res.status}`);
        if (!res.ok) throw new ModelUnavailable(`model request rejected: ${res.status}`);
        const body: unknown = await res.json();
        const text = (body as { content?: { type?: string; text?: unknown }[] }).content
          ?.find((c) => c.type === "text")?.text;
        if (typeof text !== "string") throw new ModelUnavailable("model reply had no text");
        return text;
      } catch (err) {
        lastError = err;
      }
    }
    throw new ModelUnavailable("model unavailable after retries", { cause: lastError });
  }
}

/** Used when no API key is configured: every call fails, so the app falls back to manual entry. */
export const disabledModel: ModelClient = {
  async complete() {
    throw new ModelUnavailable("no model configured");
  },
};

export function modelFromEnv(): ModelClient {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return disabledModel;
  return new AnthropicClient(key, process.env.TALLY_RECEIPT_MODEL ?? "claude-haiku-4-5");
}

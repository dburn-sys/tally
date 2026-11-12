import type { Expense, ExpenseList, ExpenseStatus, Me } from "../../src/contracts/index.js";

// Shared with the API (ADR-0004). Type-only, so nothing from src/ is bundled.
export type { Expense, Me };
export type Status = ExpenseStatus;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

/** Everything the dashboard needs from the API. Components take this, so tests pass a fake. */
export interface Api {
  me(): Promise<Me>;
  listExpenses(status: Status): Promise<Expense[]>;
  decide(id: string, action: "approve" | "reject"): Promise<void>;
}

export async function login(email: string, password: string, base = "/api"): Promise<string> {
  const res = await fetch(`${base}/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new ApiError("Wrong email or password.", res.status);
  const body: unknown = await res.json();
  const token = (body as { token?: unknown }).token;
  if (typeof token !== "string") throw new ApiError("Unexpected reply from the server.", res.status);
  return token;
}

export function httpApi(token: string, base = "/api"): Api {
  async function call(path: string, init: RequestInit = {}): Promise<unknown> {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${token}`, ...(init.body ? { "content-type": "application/json" } : {}) },
    });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const message = (body as { error?: unknown } | null)?.error;
      throw new ApiError(typeof message === "string" ? message : `Request failed (${res.status}).`, res.status);
    }
    return body;
  }
  return {
    async me() {
      return (await call("/me")) as Me;
    },
    async listExpenses(status) {
      const body = (await call(`/expenses?status=${encodeURIComponent(status)}`)) as ExpenseList;
      return body.expenses;
    },
    async decide(id, action) {
      await call(`/expenses/${encodeURIComponent(id)}/${action}`, { method: "POST" });
    },
  };
}

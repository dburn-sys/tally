// Shapes that cross between the API and the dashboard (ADR-0004, rule A-1).
// The dashboard imports these with `import type` only.

export type ExpenseStatus = "submitted" | "approved" | "rejected" | "paid";
export type Role = "employee" | "approver" | "finance";

/** An expense as the API returns it. Amounts are decimal strings (ADR-0002). */
export type Expense = {
  id: string;
  description: string;
  category: string;
  amount: string;
  currency: string;
  spentOn: string;
  createdAt: string;
  userId: string | null;
  status: ExpenseStatus;
};

export type ExpenseList = { expenses: Expense[]; total: string };

/** GET /me */
export type Me = { id: string; email: string; role: Role };

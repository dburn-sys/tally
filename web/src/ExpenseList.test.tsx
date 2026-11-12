import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError, type Api, type Expense, type Status } from "./api";
import { ExpenseList } from "./ExpenseList";

afterEach(cleanup);

const expense = (id: string, status: Status, description = `Expense ${id}`): Expense =>
  ({ id, description, category: "meals", amount: "12.50", currency: "USD", spentOn: "2026-03-02", status });

/** An API whose data lives in memory, recording what the component asked for. */
function fakeApi(rows: Expense[], refuse: Record<string, ApiError> = {}) {
  const asked: Status[] = [];
  const api: Api & { asked: Status[] } = {
    asked,
    async me() { return { id: "u", email: "a@example.com", role: "approver" }; },
    async listExpenses(status) { asked.push(status); return rows.filter((r) => r.status === status); },
    async decide(id, action) {
      if (refuse[id]) throw refuse[id];
      const row = rows.find((r) => r.id === id)!;
      row.status = action === "approve" ? "approved" : "rejected";
    },
  };
  return api;
}
const items = () => within(screen.getByRole("list", { name: "Expenses" })).queryAllByRole("listitem");

describe("approver dashboard", () => {
  it("AC-1: lists submitted expenses with description, category, amount, and date", async () => {
    render(<ExpenseList api={fakeApi([expense("1", "submitted", "Team lunch"), expense("2", "approved")])} />);
    const row = await screen.findByText("Team lunch");
    expect(items()).toHaveLength(1);
    const li = row.closest("li")!;
    expect(li.textContent).toContain("meals");
    expect(li.textContent).toContain("12.50 USD");
    expect(li.textContent).toContain("2026-03-02");
  });

  it("AC-2: the filter refetches and shows only that status", async () => {
    const api = fakeApi([expense("1", "submitted"), expense("2", "approved", "Old hotel"), expense("3", "rejected")]);
    render(<ExpenseList api={api} />);
    await screen.findByText("Expense 1");
    await userEvent.click(screen.getByRole("button", { name: "Approved" }));
    await screen.findByText("Old hotel");
    expect(items()).toHaveLength(1);
    expect(api.asked).toEqual(["submitted", "approved"]);
    expect(screen.getByRole("button", { name: "Approved" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("AC-3: approving removes the expense from the waiting list", async () => {
    const rows = [expense("1", "submitted", "Taxi"), expense("2", "submitted", "Dinner")];
    render(<ExpenseList api={fakeApi(rows)} />);
    await userEvent.click(await screen.findByRole("button", { name: "Approve Taxi" }));
    expect(screen.queryByText("Taxi")).toBeNull();
    expect(rows[0].status).toBe("approved");
    await userEvent.click(screen.getByRole("button", { name: "Reject Dinner" }));
    expect(rows[1].status).toBe("rejected");
    expect(items()).toHaveLength(0);
  });

  it("AC-4: a refused decision shows the API's message and keeps the expense", async () => {
    const refusal = new ApiError("approvers can't decide their own expenses", 403);
    render(<ExpenseList api={fakeApi([expense("1", "submitted", "My own taxi")], { "1": refusal })} />);
    await userEvent.click(await screen.findByRole("button", { name: "Approve My own taxi" }));
    const li = screen.getByText("My own taxi").closest("li")!;
    expect(within(li).getByRole("alert").textContent).toBe("approvers can't decide their own expenses");
  });

  it("a slow reply for an old filter can't overwrite the current one", async () => {
    let releaseSubmitted!: () => void;
    const api: Api = {
      async me() { return { id: "u", email: "a@example.com", role: "approver" }; },
      listExpenses: (status) => status === "submitted"
        ? new Promise((resolve) => { releaseSubmitted = () => resolve([expense("1", "submitted", "Stale")]); })
        : Promise.resolve([expense("2", "approved", "Fresh")]),
      async decide() {},
    };
    render(<ExpenseList api={api} />);
    await userEvent.click(screen.getByRole("button", { name: "Approved" }));
    await screen.findByText("Fresh");
    releaseSubmitted();
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText("Stale")).toBeNull();
  });
});

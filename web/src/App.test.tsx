import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError, type Api, type Me } from "./api";
import { App } from "./App";

afterEach(cleanup);

const apiFor = (role: Me["role"]): Api => ({
  async me() { return { id: "u", email: "x@example.com", role }; },
  async listExpenses() { return []; },
  async decide() {},
});

async function signIn() {
  await userEvent.type(screen.getByLabelText("Email"), "x@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "correct horse battery");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("sign-in", () => {
  it("AC-5: a user who isn't an approver sees no expenses", async () => {
    render(<App login={async () => "t"} makeApi={() => apiFor("employee")} />);
    await signIn();
    expect(await screen.findByText(/This dashboard is for approvers/)).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Expenses" })).toBeNull();
  });

  it("an approver sees the expense list", async () => {
    render(<App login={async () => "t"} makeApi={() => apiFor("approver")} />);
    await signIn();
    expect(await screen.findByRole("list", { name: "Expenses" })).toBeTruthy();
  });

  it("a wrong password shows an error", async () => {
    render(<App login={async () => { throw new ApiError("Wrong email or password.", 401); }} makeApi={() => apiFor("approver")} />);
    await signIn();
    expect((await screen.findByRole("alert")).textContent).toBe("Wrong email or password.");
  });
});

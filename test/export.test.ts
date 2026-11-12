import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { pool } from "../src/db.js";
import { adminPool } from "../scripts/admin-db.js";
import { createCompany } from "../src/auth/users.js";
import { approvedLastMonthCsv, field, HEADER } from "../src/export/csv.js";
import { withCompany } from "../src/db.js";
import { signedInAs } from "./fixtures/auth.js";

const app = buildApp();
type Who = Awaited<ReturnType<typeof signedInAs>>;
let employee: Who, approver: Who, finance: Who, companyId: string;

/** Dates relative to the real "now", in UTC (the test company's time zone). */
const today = new Date();
const ymd = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
const lastMonth = (d: number) => ymd(today.getUTCFullYear(), today.getUTCMonth() - 1, d);
const twoMonthsAgo = (d: number) => ymd(today.getUTCFullYear(), today.getUTCMonth() - 2, d);
const thisMonth = (d: number) => ymd(today.getUTCFullYear(), today.getUTCMonth(), d);

async function expense(description: string, spentOn: string, amount = "10.00", decide?: "approve" | "reject" | "pay") {
  const e = (await app.inject({ method: "POST", url: "/expenses", headers: employee.headers,
    payload: { description, category: "meals", amount, currency: "USD", spentOn } })).json();
  if (decide === "approve" || decide === "pay") await app.inject({ method: "POST", url: `/expenses/${e.id}/approve`, headers: approver.headers });
  if (decide === "reject") await app.inject({ method: "POST", url: `/expenses/${e.id}/reject`, headers: approver.headers });
  if (decide === "pay") await app.inject({ method: "POST", url: `/expenses/${e.id}/pay`, headers: finance.headers });
  return e.id as string;
}
async function exportCsv(who: Who = finance) {
  return app.inject({ method: "GET", url: "/exports/expenses.csv", headers: who.headers });
}
const rows = (csv: string) => csv.trimEnd().split("\r\n").slice(1);

beforeAll(async () => {
  await app.ready();
  companyId = await createCompany("Export test");
  [employee, approver, finance] = await Promise.all(
    (["employee", "approver", "finance"] as const).map((r) => signedInAs(r, companyId)));
});
afterAll(async () => { await app.close(); await pool.end(); await adminPool.end(); });

describe("CSV export (issue #12)", () => {
  it("AC-6: with nothing to export, the file is just the header", async () => {
    const res = await exportCsv();
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.body).toBe(HEADER.join(",") + "\r\n");
  });

  it("AC-1: only finance can export", async () => {
    expect((await exportCsv(approver)).statusCode).toBe(403);
    expect((await exportCsv(employee)).statusCode).toBe(403);
  });

  it("AC-2, AC-3: last month's approved and paid expenses only", async () => {
    const approved = await expense("Approved last month", lastMonth(3), "10.00", "approve");
    const paid = await expense("Paid last month", lastMonth(20), "20.00", "pay");
    await expense("Submitted last month", lastMonth(5));
    await expense("Rejected last month", lastMonth(6), "10.00", "reject");
    await expense("Approved two months ago", twoMonthsAgo(15), "10.00", "approve");
    if (today.getUTCDate() > 1) await expense("Approved this month", thisMonth(1), "10.00", "approve");
    const ids = rows((await exportCsv()).body).map((r) => r.split(",").at(-1));
    expect(ids.sort()).toEqual([approved, paid].sort());
  });

  it("AC-4, AC-5: header and formats match the accounting import", async () => {
    const id = await expense("Client dinner, downtown", lastMonth(9), "1234.5", "approve");
    const csv = (await exportCsv()).body;
    expect(csv.split("\r\n")[0]).toBe("date,employee_email,category,merchant,amount,currency,approver_email,expense_id");
    const line = rows(csv).find((r) => r.endsWith(id))!;
    expect(line).toBe([lastMonth(9), employee.user.email, "meals", '"Client dinner, downtown"', "1234.50",
      "USD", approver.user.email, id].join(","));
  });

  it("AC-2: 'last month' follows the company's time zone", async () => {
    // At 13:00 UTC on 30 April it is already 1 May in Auckland. So for a UTC company
    // "last month" is March, and for an Auckland company it is April.
    const asOf = new Date("2026-04-30T13:00:00Z");
    const march = await expense("March taxi", "2026-03-15", "10.00", "approve");
    const april = await expense("April taxi", "2026-04-15", "10.00", "approve");
    const csvAt = (tz: string) => withCompany(companyId, async (db) => {
      await db.query("UPDATE companies SET time_zone = $1 WHERE id = $2", [tz, companyId]);
      return approvedLastMonthCsv(db, asOf);
    });
    const utc = await csvAt("UTC");
    expect(utc).toContain(march);
    expect(utc).not.toContain(april);
    const auckland = await csvAt("Pacific/Auckland");
    expect(auckland).toContain(april);
    expect(auckland).not.toContain(march);
    await csvAt("UTC");
  });

  it("AC-7: another company's expenses never appear", async () => {
    const other = await createCompany("Someone else");
    const [oe, oa] = await Promise.all([signedInAs("employee", other), signedInAs("approver", other)]);
    const e = (await app.inject({ method: "POST", url: "/expenses", headers: oe.headers,
      payload: { description: "Other company", category: "meals", amount: "5.00", currency: "USD", spentOn: lastMonth(4) } })).json();
    await app.inject({ method: "POST", url: `/expenses/${e.id}/approve`, headers: oa.headers });
    expect((await exportCsv()).body).not.toContain(e.id);
  });

  it("a company time zone must be real", async () => {
    await expect(adminPool.query("UPDATE companies SET time_zone = 'Mars/Olympus' WHERE id = $1", [companyId]))
      .rejects.toThrow(/companies_time_zone_valid/);
  });
});

describe("CSV fields", () => {
  it.each([
    ["=HYPERLINK(\"http://evil.example\")", "\"'=HYPERLINK(\"\"http://evil.example\"\")\""],
    ["+1 555 0100", "'+1 555 0100"],
    ["-cmd", "'-cmd"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ["\tTabbed", "'\tTabbed"],
  ])("a value that would run as a formula is neutralized: %j", (input, expected) => {
    expect(field(input)).toBe(expected);
  });
  it("ordinary values are left alone, and quoting follows RFC 4180", () => {
    expect(field("Blue Door Cafe")).toBe("Blue Door Cafe");
    expect(field('Say "hi", then go')).toBe('"Say ""hi"", then go"');
    expect(field("two\nlines")).toBe('"two\nlines"');
  });
});

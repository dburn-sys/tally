import { useEffect, useState } from "react";
import { ApiError, type Api, type Expense, type Status } from "./api";

const FILTERS: { status: Status; label: string }[] = [
  { status: "submitted", label: "Waiting" },
  { status: "approved", label: "Approved" },
  { status: "rejected", label: "Rejected" },
];

export function ExpenseList({ api }: { api: Api }) {
  const [status, setStatus] = useState<Status>("submitted");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let current = true;
    setLoadError(null);
    api.listExpenses(status)
      .then((list) => { if (current) setExpenses(list); })
      .catch((err: unknown) => {
        if (current) setLoadError(err instanceof ApiError ? err.message : "Couldn't load expenses.");
      });
    return () => { current = false; };   // a slow reply for an old filter can't overwrite a newer one
  }, [api, status]);

  async function decide(id: string, action: "approve" | "reject") {
    try {
      await api.decide(id, action);
      setExpenses((list) => list.filter((e) => e.id !== id));
      setRowErrors(({ [id]: _gone, ...rest }) => rest);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Something went wrong. Try again.";
      setRowErrors((errors) => ({ ...errors, [id]: message }));
    }
  }

  return (
    <section>
      <div role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button key={f.status} type="button" aria-pressed={status === f.status} onClick={() => setStatus(f.status)}>
            {f.label}
          </button>
        ))}
      </div>
      {loadError && <p role="alert">{loadError}</p>}
      {!loadError && expenses.length === 0 && <p>No expenses here.</p>}
      <ul aria-label="Expenses">
        {expenses.map((e) => (
          <li key={e.id}>
            <span>{e.description}</span> <span>{e.category}</span>{" "}
            <span>{e.amount} {e.currency}</span> <span>{e.spentOn}</span>
            {e.policyWarning && <p aria-label="Policy warning">Policy: {e.policyWarning}</p>}
            {status === "submitted" && (
              <>
                <button type="button" onClick={() => decide(e.id, "approve")} aria-label={`Approve ${e.description}`}>Approve</button>
                <button type="button" onClick={() => decide(e.id, "reject")} aria-label={`Reject ${e.description}`}>Reject</button>
              </>
            )}
            {rowErrors[e.id] && <p role="alert">{rowErrors[e.id]}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

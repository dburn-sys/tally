import { useMemo, useState, type FormEvent } from "react";
import { httpApi, login as defaultLogin, type Api, type Me } from "./api";
import { ExpenseList } from "./ExpenseList";

type Props = {
  login?: (email: string, password: string) => Promise<string>;
  makeApi?: (token: string) => Api;
};

export function App({ login = defaultLogin, makeApi = httpApi }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const api = useMemo(() => (token ? makeApi(token) : null), [token, makeApi]);

  async function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const t = await login(String(form.get("email")), String(form.get("password")));
      setMe(await makeApi(t).me());
      setToken(t);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't sign in.");
    }
  }

  if (!api || !me) {
    return (
      <main>
        <h1>Tally approvals</h1>
        <form onSubmit={signIn}>
          <label>Email <input name="email" type="email" required autoComplete="username" /></label>
          <label>Password <input name="password" type="password" required autoComplete="current-password" /></label>
          <button type="submit">Sign in</button>
        </form>
        {error && <p role="alert">{error}</p>}
      </main>
    );
  }
  return (
    <main>
      <h1>Tally approvals</h1>
      {me.role === "approver"
        ? <ExpenseList api={api} />
        : <p>This dashboard is for approvers. You're signed in as {me.role}.</p>}
    </main>
  );
}

import { randomUUID } from "node:crypto";
import { pool, withCompany } from "../db.js";
import { hashApiKey } from "./apikeys.js";
import { hashPassword } from "./password.js";
import { verifySessionToken } from "./session.js";

export type Role = "employee" | "approver" | "finance";
export type User = { id: string; email: string; role: Role; companyId: string };

const IDENTITY = `id, email, role, company_id AS "companyId"`;

export async function createCompany(name: string): Promise<string> {
  const id = randomUUID();
  await withCompany(id, (db) => db.query("INSERT INTO companies (id, name) VALUES ($1, $2)", [id, name]));
  return id;
}

export async function createUser(
  companyId: string, email: string, password: string, role: Role,
): Promise<User> {
  const hash = await hashPassword(password);
  return withCompany(companyId, async (db) => {
    const { rows } = await db.query<User>(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING ${IDENTITY}`,
      [email.toLowerCase(), hash, role],
    );
    return rows[0];
  });
}

/** Look up a user for login. Runs before the company is known (ADR-0001). */
export async function userForLogin(email: string) {
  const { rows } = await pool.query<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM auth_user_by_email($1)", [email],
  );
  return rows[0] ?? null;
}

/** Resolve the caller from a Bearer session token or an X-Api-Key header. */
export async function userFromHeaders(headers: Record<string, unknown>): Promise<User | null> {
  const auth = typeof headers.authorization === "string" ? headers.authorization : "";
  if (auth.startsWith("Bearer ")) {
    const id = verifySessionToken(auth.slice(7));
    if (!id) return null;
    const { rows } = await pool.query<User>(`SELECT ${IDENTITY} FROM auth_user_by_id($1)`, [id]);
    return rows[0] ?? null;
  }
  const key = headers["x-api-key"];
  if (typeof key === "string" && key.length > 0) {
    const { rows } = await pool.query<User>(
      `SELECT ${IDENTITY} FROM auth_user_by_key($1)`, [hashApiKey(key)]);
    return rows[0] ?? null;
  }
  return null;
}

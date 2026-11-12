import { pool } from "../db.js";
import { hashApiKey } from "./apikeys.js";
import { hashPassword } from "./password.js";
import { verifySessionToken } from "./session.js";

export type Role = "employee" | "approver" | "finance";
export type User = { id: string; email: string; role: Role };

export async function createUser(email: string, password: string, role: Role): Promise<User> {
  const { rows } = await pool.query<User>(
    "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role",
    [email.toLowerCase(), await hashPassword(password), role],
  );
  return rows[0];
}

/** Resolve the caller from a Bearer session token or an X-Api-Key header. */
export async function userFromHeaders(headers: Record<string, unknown>): Promise<User | null> {
  const auth = typeof headers.authorization === "string" ? headers.authorization : "";
  if (auth.startsWith("Bearer ")) {
    const id = verifySessionToken(auth.slice(7));
    if (!id) return null;
    const { rows } = await pool.query<User>("SELECT id, email, role FROM users WHERE id = $1", [id]);
    return rows[0] ?? null;
  }
  const key = headers["x-api-key"];
  if (typeof key === "string" && key.length > 0) {
    const { rows } = await pool.query<User>(
      `SELECT u.id, u.email, u.role FROM api_keys k JOIN users u ON u.id = k.user_id
       WHERE k.key_hash = $1`,
      [hashApiKey(key)],
    );
    return rows[0] ?? null;
  }
  return null;
}

import { pool } from "../db.js";
import { hashApiKey } from "./apikeys.js";
import { verifySessionToken } from "./session.js";
import { IDENTITY, type User } from "./users.js";

/**
 * The one way to build the current user. Session tokens and API keys both end
 * here, so every rule about "who is acting" (roles, company, self-approval)
 * sees the same User, whichever way the caller signed in.
 */
export async function currentUser(headers: Record<string, unknown>): Promise<User | null> {
  const id = await userIdFromHeaders(headers);
  if (!id) return null;
  const { rows } = await pool.query<User>(`SELECT ${IDENTITY} FROM auth_user_by_id($1)`, [id]);
  return rows[0] ?? null;
}

/** Authentication only: which user id do these credentials prove? */
async function userIdFromHeaders(headers: Record<string, unknown>): Promise<string | null> {
  const auth = typeof headers.authorization === "string" ? headers.authorization : "";
  if (auth.startsWith("Bearer ")) return verifySessionToken(auth.slice(7));
  const key = headers["x-api-key"];
  if (typeof key === "string" && key.length > 0) {
    const { rows } = await pool.query<{ id: string }>(
      "SELECT id FROM auth_user_by_key($1)", [hashApiKey(key)]);
    return rows[0]?.id ?? null;
  }
  return null;
}

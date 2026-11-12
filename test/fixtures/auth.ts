import { randomBytes, randomUUID } from "node:crypto";
import { createUser, type Role } from "../../src/auth/users.js";
import { createSessionToken } from "../../src/auth/session.js";

export const TEST_SIGNING_KEY = randomBytes(32).toString("hex");
if (!process.env.TALLY_SIGNING_KEY) process.env.TALLY_SIGNING_KEY = TEST_SIGNING_KEY;

/** Create a user with a random email and return an Authorization header for them. */
export async function signedInAs(role: Role) {
  const user = await createUser(`${role}-${randomUUID()}@example.com`, "correct horse battery", role);
  return { user, headers: { authorization: `Bearer ${createSessionToken(user.id)}` } };
}

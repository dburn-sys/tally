import { randomBytes, randomUUID } from "node:crypto";
import { createCompany, createUser, type Role } from "../../src/auth/users.js";
import { createSessionToken } from "../../src/auth/session.js";

export const TEST_SIGNING_KEY = randomBytes(32).toString("hex");
if (!process.env.TALLY_SIGNING_KEY) process.env.TALLY_SIGNING_KEY = TEST_SIGNING_KEY;

let defaultCompany: Promise<string> | undefined;

/** One company per test file, unless a test asks for its own. */
export function testCompany(): Promise<string> {
  defaultCompany ??= createCompany(`test-${randomUUID()}`);
  return defaultCompany;
}

/** Create a user with a random email and return an Authorization header for them. */
export async function signedInAs(role: Role, companyId?: string) {
  const company = companyId ?? (await testCompany());
  const user = await createUser(company, `${role}-${randomUUID()}@example.com`, "correct horse battery", role);
  return { user, headers: { authorization: `Bearer ${createSessionToken(user.id)}` } };
}

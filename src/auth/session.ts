import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_SECONDS = 12 * 60 * 60;

function signingKey(): string {
  const key = process.env.TALLY_SIGNING_KEY;
  if (!key) throw new Error("TALLY_SIGNING_KEY is not set");
  return key;
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

/** A session token is "<userId>.<expiryEpochSeconds>.<signature>". */
export function createSessionToken(userId: string, now = Date.now()): string {
  const payload = `${userId}.${Math.floor(now / 1000) + SESSION_SECONDS}`;
  return `${payload}.${sign(payload)}`;
}

/** Return the user id for a valid, unexpired token, or null. */
export function verifySessionToken(token: string, now = Date.now()): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiry, signature] = parts;
  const expected = Buffer.from(sign(`${userId}.${expiry}`));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (Number(expiry) * 1000 <= now) return null;
  return userId;
}

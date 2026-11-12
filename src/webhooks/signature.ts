import { createHmac, timingSafeEqual } from "node:crypto";

export const TOLERANCE_SECONDS = 300;

/** The header value Payrail sends: "t=<unix seconds>,v1=<hex HMAC-SHA256 of `${t}.${body}`>". */
export function signPayload(raw: Buffer | string, secret: string, t = Math.floor(Date.now() / 1000)): string {
  const sig = createHmac("sha256", secret).update(`${t}.`).update(raw).digest("hex");
  return `t=${t},v1=${sig}`;
}

/** Constant-time check of the signature, then of the timestamp window. */
export function verifySignature(raw: Buffer, header: string, secret: string, now = Date.now()): boolean {
  if (!secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => {
    const i = p.indexOf("=");
    return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
  }));
  const t = Number(parts.t);
  if (!Number.isInteger(t) || !/^[0-9a-f]{64}$/.test(parts.v1 ?? "")) return false;
  const expected = createHmac("sha256", secret).update(`${t}.`).update(raw).digest();
  const given = Buffer.from(parts.v1, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  return Math.abs(now / 1000 - t) <= TOLERANCE_SECONDS;
}

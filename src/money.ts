const AMOUNT = /^\d+(\.\d{1,2})?$/;

/** Parse a decimal string like "84.50" into integer cents, or null if invalid. */
export function toCents(amount: string): number | null {
  if (!AMOUNT.test(amount)) return null;
  const [whole, frac = ""] = amount.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** Format integer cents as a decimal string like "84.50". */
export function fromCents(cents: number | string): string {
  const n = BigInt(cents);
  const whole = n / 100n;
  const frac = (n % 100n).toString().padStart(2, "0");
  return `${whole}.${frac}`;
}

import type { FastifyInstance } from "fastify";
import { withCompany } from "../db.js";
import { verifySignature } from "./signature.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PayoutEvent = { id: string; payoutId: string; companyId: string; status: "paid" | "failed" };

/** Only the fields we act on. Anything else in the event (amounts included) is ignored. */
function parseEvent(raw: Buffer): PayoutEvent | null {
  try {
    const e: unknown = JSON.parse(raw.toString("utf8"));
    const ev = e as { id?: unknown; status?: unknown; metadata?: { payoutId?: unknown; companyId?: unknown } };
    const { payoutId, companyId } = ev.metadata ?? {};
    if (typeof ev.id !== "string" || ev.id.length === 0 || ev.id.length > 100) return null;
    if (typeof payoutId !== "string" || !UUID.test(payoutId)) return null;
    if (typeof companyId !== "string" || !UUID.test(companyId)) return null;
    if (ev.status !== "paid" && ev.status !== "failed") return null;
    return { id: ev.id, payoutId, companyId, status: ev.status };
  } catch {
    return null;
  }
}

/**
 * Payrail's callback. Registered in its own scope so it gets the raw body: the
 * signature covers the exact bytes sent. payoutId and companyId are ids we sent
 * in the payout's metadata; the signature proves they came back unchanged.
 */
export function registerPayoutWebhook(app: FastifyInstance, secret: string) {
  app.register(async (scope) => {
    scope.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => done(null, body));

    scope.post("/webhooks/payrail", async (req, reply) => {
      const raw = req.body as Buffer;
      const header = req.headers["payrail-signature"];
      if (typeof header !== "string" || !verifySignature(raw, header, secret)) {
        return reply.code(401).send({ error: "invalid signature" });
      }
      const event = parseEvent(raw);
      if (!event) return reply.code(400).send({ error: "unrecognized event" });

      return withCompany(event.companyId, async (db) => {
        const payout = await db.query<{ status: string; expense_id: string; created_by: string }>(
          "SELECT status, expense_id, created_by FROM payouts WHERE id = $1 FOR UPDATE", [event.payoutId]);
        if (!payout.rows[0]) return reply.code(404).send({ error: "unknown payout" });

        // Concurrent copies of one event: the primary key lets exactly one insert win.
        const first = await db.query(
          "INSERT INTO webhook_events (id, payout_id) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
          [event.id, event.payoutId]);
        if (first.rowCount === 0) return { received: true, duplicate: true };

        const { status, expense_id, created_by } = payout.rows[0];
        if (status !== "pending") return { received: true, duplicate: false };   // AC-11
        await db.query("UPDATE payouts SET status = $1 WHERE id = $2", [event.status, event.payoutId]);
        if (event.status === "paid") {
          const moved = await db.query(
            "UPDATE expenses SET status = 'paid' WHERE id = $1 AND status = 'approved'", [expense_id]);
          if (moved.rowCount) {
            await db.query(
              `INSERT INTO expense_events (expense_id, actor_id, from_status, to_status)
               VALUES ($1, $2, 'approved', 'paid')`, [expense_id, created_by]);
          }
        }
        return { received: true, duplicate: false };
      });
    });
  });
}

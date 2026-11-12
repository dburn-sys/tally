import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { withCompany } from "./db.js";
import { fromCents, toCents } from "./money.js";
import { hashApiKey, newApiKey } from "./auth/apikeys.js";
import { verifyPassword } from "./auth/password.js";
import { createSessionToken } from "./auth/session.js";
import { currentUser } from "./auth/context.js";
import { userForLogin, type User } from "./auth/users.js";
import { history, transition, TransitionError, type Action } from "./approvals/service.js";

import { CATEGORIES } from "./categories.js";
import { modelFromEnv, type ModelClient } from "./ai/model.js";
import { MAX_RECEIPT_CHARS, suggestFields } from "./ai/receipts/reader.js";

export { CATEGORIES };
export type AppOptions = { model?: ModelClient };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS = `id, description, category, amount_cents, currency,
  to_char(spent_on, 'YYYY-MM-DD') AS spent_on, created_at, user_id, status`;

type ExpenseRow = {
  id: string;
  description: string;
  category: string;
  amount_cents: string;
  currency: string;
  spent_on: string;
  created_at: string;
  user_id: string | null;
  status: string;
};

declare module "fastify" {
  interface FastifyRequest { user?: User }
}

function toApi(row: ExpenseRow) {
  return {
    id: row.id,
    description: row.description,
    category: row.category,
    amount: fromCents(row.amount_cents),
    currency: row.currency,
    spentOn: row.spent_on,
    createdAt: row.created_at,
    userId: row.user_id,
    status: row.status,
  };
}

/** Employees see only their own expenses; approvers and finance see all. */
function seesAll(user: User): boolean {
  return user.role !== "employee";
}

async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  const user = await currentUser(req.headers);
  if (!user) return reply.code(401).send({ error: "authentication required" });
  req.user = user;
}

export function buildApp(options: AppOptions = {}) {
  const model = options.model ?? modelFromEnv();
  const app = Fastify();

  app.post("/login", {
    schema: {
      body: {
        type: "object",
        required: ["email", "password"],
        properties: { email: { type: "string" }, password: { type: "string" } },
      },
    },
  }, async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string };
    const user = await userForLogin(email);
    const ok = user ? await verifyPassword(password, user.password_hash) : false;
    if (!ok || !user) return reply.code(401).send({ error: "invalid email or password" });
    return { token: createSessionToken(user.id) };
  });

  app.register(async (secured) => {
    secured.addHook("preHandler", requireUser);

    secured.post("/api-keys", async (req, reply) => {
      const key = newApiKey();
      await withCompany(req.user!.companyId, (db) =>
        db.query("INSERT INTO api_keys (user_id, key_hash) VALUES ($1, $2)", [req.user!.id, hashApiKey(key)]));
      return reply.code(201).send({ key });   // shown once; only the hash is stored
    });

    // Suggestions only: the employee confirms and submits through POST /expenses.
    secured.post("/receipts/suggest", {
      schema: {
        body: {
          type: "object",
          required: ["text"],
          properties: { text: { type: "string", minLength: 1, maxLength: MAX_RECEIPT_CHARS } },
        },
      },
    }, async (req) => suggestFields(model, (req.body as { text: string }).text));

    secured.post("/expenses", {
      schema: {
        body: {
          type: "object",
          required: ["description", "category", "amount", "currency", "spentOn"],
          properties: {
            description: { type: "string", minLength: 1 },
            category: { type: "string", enum: [...CATEGORIES] },
            amount: { type: "string" },
            currency: { type: "string", minLength: 3, maxLength: 3 },
            spentOn: { type: "string", format: "date" },
          },
        },
      },
    }, async (req, reply) => {
      const b = req.body as { description: string; category: string; amount: string; currency: string; spentOn: string };
      const cents = toCents(b.amount);
      if (cents === null || cents <= 0) {
        return reply.code(400).send({ error: "amount must be a positive decimal with at most 2 places" });
      }
      const today = new Date().toISOString().slice(0, 10);
      if (b.spentOn > today) return reply.code(400).send({ error: "spentOn can't be in the future" });
      const { rows } = await withCompany(req.user!.companyId, (db) => db.query<ExpenseRow>(
        `INSERT INTO expenses (description, category, amount_cents, currency, spent_on, user_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLUMNS}`,
        [b.description, b.category, cents, b.currency, b.spentOn, req.user!.id],
      ));
      return reply.code(201).send(toApi(rows[0]));
    });

    secured.get("/expenses", async (req) => {
      const all = seesAll(req.user!);
      const where = all ? "" : "WHERE user_id = $1";
      const params = all ? [] : [req.user!.id];
      return withCompany(req.user!.companyId, async (db) => {
        const totals = await db.query<{ total: string }>(
          `SELECT coalesce(sum(amount_cents), 0)::text AS total FROM expenses ${where}`, params);
        const { rows } = await db.query<ExpenseRow>(
          `SELECT ${COLUMNS} FROM expenses ${where} ORDER BY created_at DESC`, params);
        return { expenses: rows.map(toApi), total: fromCents(totals.rows[0].total) };
      });
    });

    secured.get("/expenses/:id", async (req, reply) => {
      const { id } = req.params as { id: string };
      if (!UUID.test(id)) return reply.code(400).send({ error: "id must be a UUID" });
      const { rows } = await withCompany(req.user!.companyId, (db) =>
        db.query<ExpenseRow>(`SELECT ${COLUMNS} FROM expenses WHERE id = $1`, [id]));
      const row = rows[0];
      if (!row || (!seesAll(req.user!) && row.user_id !== req.user!.id)) {
        return reply.code(404).send({ error: "not found" });
      }
      return toApi(row);
    });

    for (const action of ["approve", "reject", "pay"] as Action[]) {
      secured.post(`/expenses/:id/${action}`, async (req, reply) => {
        const { id } = req.params as { id: string };
        if (!UUID.test(id)) return reply.code(400).send({ error: "id must be a UUID" });
        try {
          const status = await withCompany(req.user!.companyId, (db) => transition(db, id, req.user!, action));
          return { status };
        } catch (err) {
          if (err instanceof TransitionError) return reply.code(err.httpStatus).send({ error: err.message });
          throw err;
        }
      });
    }

    secured.get("/expenses/:id/history", async (req, reply) => {
      const { id } = req.params as { id: string };
      if (!UUID.test(id)) return reply.code(400).send({ error: "id must be a UUID" });
      return withCompany(req.user!.companyId, (db) => history(db, id));
    });
  });

  return app;
}

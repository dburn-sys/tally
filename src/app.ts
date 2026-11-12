import Fastify from "fastify";
import { pool } from "./db.js";
import { fromCents, toCents } from "./money.js";

export const CATEGORIES = ["travel", "meals", "lodging", "supplies", "other"] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ExpenseRow = {
  id: string;
  description: string;
  category: string;
  amount_cents: string;
  currency: string;
  spent_on: string;
  created_at: string;
};

function toApi(row: ExpenseRow) {
  return {
    id: row.id,
    description: row.description,
    category: row.category,
    amount: fromCents(row.amount_cents),
    currency: row.currency,
    spentOn: row.spent_on,
    createdAt: row.created_at,
  };
}

export function buildApp() {
  const app = Fastify();

  app.post("/expenses", {
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
    const { rows } = await pool.query<ExpenseRow>(
      `INSERT INTO expenses (description, category, amount_cents, currency, spent_on)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, description, category, amount_cents, currency, to_char(spent_on, 'YYYY-MM-DD') AS spent_on, created_at`,
      [b.description, b.category, cents, b.currency, b.spentOn],
    );
    return reply.code(201).send(toApi(rows[0]));
  });

  app.get("/expenses", async () => {
    const totals = await pool.query<{ total: string }>(
      "SELECT coalesce(sum(amount_cents), 0)::text AS total FROM expenses",
    );
    const { rows } = await pool.query<ExpenseRow>(
      `SELECT id, description, category, amount_cents, currency, to_char(spent_on, 'YYYY-MM-DD') AS spent_on, created_at
       FROM expenses ORDER BY created_at DESC`,
    );
    return { expenses: rows.map(toApi), total: fromCents(totals.rows[0].total) };
  });

  app.get("/expenses/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!UUID.test(id)) return reply.code(400).send({ error: "id must be a UUID" });
    const { rows } = await pool.query<ExpenseRow>(
      `SELECT id, description, category, amount_cents, currency, to_char(spent_on, 'YYYY-MM-DD') AS spent_on, created_at
       FROM expenses WHERE id = $1`,
      [id],
    );
    if (rows.length === 0) return reply.code(404).send({ error: "not found" });
    return toApi(rows[0]);
  });

  return app;
}

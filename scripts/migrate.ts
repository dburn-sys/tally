import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { adminPool as pool } from "./admin-db.js";

const dir = join(import.meta.dirname, "..", "migrations");

await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
const done = new Set(
  (await pool.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map((r) => r.name),
);
for (const name of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(name)) continue;
  const sql = await readFile(join(dir, name), "utf8");
  await pool.query("BEGIN");
  try {
    await pool.query(sql);
    await pool.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
    await pool.query("COMMIT");
    console.log(`applied ${name}`);
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}
// The app role from migration 007 can log in only once it has a password.
const exists = await pool.query("SELECT 1 FROM pg_roles WHERE rolname = 'tally_app'");
if (exists.rowCount) {
  const password = process.env.TALLY_APP_PASSWORD ?? "tally_app";
  const { rows } = await pool.query<{ sql: string }>(
    "SELECT format('ALTER ROLE tally_app LOGIN PASSWORD %L', $1::text) AS sql", [password]);
  await pool.query(rows[0].sql);
}
await pool.end();

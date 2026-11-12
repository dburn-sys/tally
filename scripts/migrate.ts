import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pool } from "../src/db.js";

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
await pool.end();

import pg from "pg";

/** The application's connection. It uses the tally_app role, which owns no tables. */
const connectionString =
  process.env.DATABASE_URL ?? "postgres://tally_app:tally_app@localhost:5432/tally";

export const pool = new pg.Pool({ connectionString });

/**
 * Run fn in one transaction scoped to a company (ADR-0001). The setting is
 * transaction-local, so it can't leak to the next user of this connection.
 */
export async function withCompany<T>(
  companyId: string,
  fn: (db: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('tally.company_id', $1, true)", [companyId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

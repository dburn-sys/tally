import pg from "pg";

/**
 * The table owner's connection. Only migrations and test setup use it; the
 * application never does (ADR-0001).
 */
export const adminPool = new pg.Pool({
  connectionString:
    process.env.MIGRATION_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/tally",
});

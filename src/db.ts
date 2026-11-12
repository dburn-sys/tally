import pg from "pg";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/tally";

export const pool = new pg.Pool({ connectionString });

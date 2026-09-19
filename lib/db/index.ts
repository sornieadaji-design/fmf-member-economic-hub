import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "./types";

/**
 * Shared Postgres connection pool + typed Kysely instance.
 * The SAME pool is handed to @auth/pg-adapter in lib/auth/index.ts, so auth and
 * domain queries share one connection pool.
 *
 * `numeric` columns come back from pg as strings (to preserve precision) — that is
 * intentional; format them with lib/utils/format.ts, and never do float maths on money.
 */
if (!process.env.DATABASE_URL) {
  // Fail loudly rather than silently connecting to the wrong place.
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});

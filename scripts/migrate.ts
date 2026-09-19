import "./_env";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Kysely, Migrator, FileMigrationProvider, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "../lib/db/types";

/**
 * Migration runner. Usage:
 *   pnpm db:migrate            -> migrate to latest
 *   pnpm db:migrate:down       -> roll back the most recent migration
 *
 * Run against a database you can afford to change. Migrations are forward-only in
 * spirit; `down` exists for local iteration.
 */
async function main() {
  const direction = process.argv[2] === "down" ? "down" : "up";

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
  }

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: process.env.DATABASE_URL }),
    }),
  });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, "..", "migrations"),
    }),
  });

  const { error, results } =
    direction === "up"
      ? await migrator.migrateToLatest()
      : await migrator.migrateDown();

  results?.forEach((r) => {
    if (r.status === "Success") {
      console.log(`✓ ${r.migrationName} (${r.direction})`);
    } else if (r.status === "Error") {
      console.error(`✗ ${r.migrationName} failed`);
    }
  });

  if (error) {
    console.error("Migration failed:", error);
    await db.destroy();
    process.exit(1);
  }

  await db.destroy();
  console.log(`Migrations ${direction} complete.`);
}

main();

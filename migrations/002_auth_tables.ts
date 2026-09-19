import { Kysely, sql } from "kysely";

/**
 * Auth.js (@auth/pg-adapter) tables.
 *
 * This uses UUID primary keys (not the adapter docs' default SERIAL) so the whole
 * schema is uniformly UUID and FMF tables can FK to users.id as uuid. The adapter's
 * createUser/createSession/linkAccount use `RETURNING` and let the DB default the id,
 * so a uuid default is compatible.
 *
 * ⚠️ VERIFY the column set against the current @auth/pg-adapter source before go-live;
 * the adapter references these exact (camelCase) column names.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "text")
    .addColumn("email", "text", (c) => c.unique())
    .addColumn("emailVerified", sql`timestamptz`)
    .addColumn("image", "text")
    .execute();

  await db.schema
    .createTable("accounts")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("userId", "uuid", (c) =>
      c.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("type", "text", (c) => c.notNull())
    .addColumn("provider", "text", (c) => c.notNull())
    .addColumn("providerAccountId", "text", (c) => c.notNull())
    .addColumn("refresh_token", "text")
    .addColumn("access_token", "text")
    .addColumn("expires_at", "bigint")
    .addColumn("token_type", "text")
    .addColumn("scope", "text")
    .addColumn("id_token", "text")
    .addColumn("session_state", "text")
    .addUniqueConstraint("accounts_provider_providerAccountId_key", [
      "provider",
      "providerAccountId",
    ])
    .execute();

  await db.schema
    .createTable("sessions")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("userId", "uuid", (c) =>
      c.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("sessionToken", "text", (c) => c.notNull().unique())
    .addColumn("expires", sql`timestamptz`, (c) => c.notNull())
    .execute();

  await db.schema
    .createTable("verification_token")
    .addColumn("identifier", "text", (c) => c.notNull())
    .addColumn("token", "text", (c) => c.notNull())
    .addColumn("expires", sql`timestamptz`, (c) => c.notNull())
    .addPrimaryKeyConstraint("verification_token_pkey", ["identifier", "token"])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("verification_token").ifExists().execute();
  await db.schema.dropTable("sessions").ifExists().execute();
  await db.schema.dropTable("accounts").ifExists().execute();
  await db.schema.dropTable("users").ifExists().execute();
}

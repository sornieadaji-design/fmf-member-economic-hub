import { Kysely, sql } from "kysely";

/**
 * audit_logs — immutable, append-only (build spec §4.12, §7.5).
 *
 * Two layers of enforcement:
 *   1) A BEFORE UPDATE OR DELETE trigger that raises an exception — portable, always on,
 *      independent of which DB role connects.
 *   2) (Optional) REVOKE UPDATE, DELETE from the application DB role, if APP_DB_ROLE is set.
 *      Set APP_DB_ROLE in the environment to the least-privilege role your app connects as.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("audit_logs")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("actor_id", "uuid", (c) =>
      c.notNull().references("users.id").onDelete("restrict"),
    )
    .addColumn("action", "text", (c) => c.notNull())
    .addColumn("entity", "text")
    .addColumn("entity_id", "uuid")
    .addColumn("details", "jsonb", (c) => c.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", sql`timestamptz`, (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("audit_logs_created_idx")
    .on("audit_logs")
    .column("created_at")
    .execute();
  await db.schema
    .createIndex("audit_logs_entity_idx")
    .on("audit_logs")
    .columns(["entity", "entity_id"])
    .execute();

  // Layer 1: trigger — reject any UPDATE or DELETE.
  await sql`
    CREATE OR REPLACE FUNCTION fmf_audit_logs_immutable()
    RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'audit_logs is append-only: % is not permitted', TG_OP;
    END;
    $$ LANGUAGE plpgsql;
  `.execute(db);

  await sql`
    CREATE TRIGGER audit_logs_no_mutate
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION fmf_audit_logs_immutable();
  `.execute(db);

  // Layer 2: revoke privileges from the app role, if one is configured.
  const appRole = process.env.APP_DB_ROLE;
  if (appRole && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(appRole)) {
    await sql`REVOKE UPDATE, DELETE ON audit_logs FROM ${sql.raw(appRole)}`.execute(db);
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TRIGGER IF EXISTS audit_logs_no_mutate ON audit_logs`.execute(db);
  await sql`DROP FUNCTION IF EXISTS fmf_audit_logs_immutable()`.execute(db);
  await db.schema.dropTable("audit_logs").ifExists().execute();
}

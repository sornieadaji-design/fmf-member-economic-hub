import { Kysely, sql } from "kysely";

/** welfare_claims (build spec §4.7). Payout above threshold needs a second approval (via 010). */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("welfare_claims")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("member_id", "uuid", (c) =>
      c.notNull().references("users.id").onDelete("restrict"),
    )
    .addColumn("category", sql`welfare_category`, (c) => c.notNull())
    .addColumn("amount_requested", sql`numeric(14, 2)`, (c) =>
      c.notNull().check(sql`amount_requested >= 0`),
    )
    .addColumn("reason", "text")
    .addColumn("evidence_url", "text")
    .addColumn("status", sql`welfare_status`, (c) => c.notNull().defaultTo("submitted"))
    .addColumn("created_at", sql`timestamptz`, (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("created_by", "uuid", (c) => c.references("users.id"))
    .execute();

  await db.schema
    .createIndex("welfare_member_idx")
    .on("welfare_claims")
    .columns(["member_id", "status"])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("welfare_claims").ifExists().execute();
}

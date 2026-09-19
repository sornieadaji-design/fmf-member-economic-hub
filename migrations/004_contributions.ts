import { Kysely, sql } from "kysely";

/** contributions — every savings/welfare/investment/registration/levy payment (build spec §4.2). */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("contributions")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("member_id", "uuid", (c) =>
      c.notNull().references("users.id").onDelete("restrict"),
    )
    .addColumn("type", sql`contribution_type`, (c) => c.notNull().defaultTo("savings"))
    .addColumn("amount", sql`numeric(14, 2)`, (c) =>
      c.notNull().check(sql`amount >= 0`),
    )
    .addColumn("currency", "text", (c) => c.notNull().defaultTo("NGN"))
    .addColumn("period", "text")
    .addColumn("method", sql`contribution_method`, (c) =>
      c.notNull().defaultTo("bank_transfer"),
    )
    .addColumn("payment_reference", "text")
    .addColumn("receipt_url", "text")
    .addColumn("status", sql`contribution_status`, (c) =>
      c.notNull().defaultTo("pending"),
    )
    .addColumn("confirmed_by", "uuid", (c) => c.references("users.id"))
    .addColumn("confirmed_date", sql`timestamptz`)
    .addColumn("notes", "text")
    .addColumn("created_at", sql`timestamptz`, (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("created_by", "uuid", (c) => c.references("users.id"))
    .execute();

  await db.schema
    .createIndex("contributions_member_idx")
    .on("contributions")
    .columns(["member_id", "status"])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("contributions").ifExists().execute();
}

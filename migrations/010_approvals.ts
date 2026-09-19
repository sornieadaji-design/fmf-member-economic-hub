import { Kysely, sql } from "kysely";

/**
 * approvals — dual-control (build spec §4.11, §7.3).
 *
 * The headline governance control. UNIQUE(target_entity, target_id, approver_id)
 * means a given officer can record at most ONE approval per item — so two 'approved'
 * rows on the same item are guaranteed to be two DISTINCT officers. No single officer
 * can ever produce a second approval to advance a loan/allocation/payout alone.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("approvals")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("target_entity", sql`approval_target`, (c) => c.notNull())
    .addColumn("target_id", "uuid", (c) => c.notNull())
    .addColumn("approver_id", "uuid", (c) =>
      c.notNull().references("users.id").onDelete("restrict"),
    )
    .addColumn("approver_role", "text")
    .addColumn("decision", sql`approval_decision`, (c) => c.notNull())
    .addColumn("comment", "text")
    .addColumn("created_at", sql`timestamptz`, (c) => c.notNull().defaultTo(sql`now()`))
    // Two distinct officers guaranteed: one approval per (item, officer).
    .addUniqueConstraint("approvals_one_per_officer_per_target", [
      "target_entity",
      "target_id",
      "approver_id",
    ])
    .execute();

  await db.schema
    .createIndex("approvals_target_idx")
    .on("approvals")
    .columns(["target_entity", "target_id"])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("approvals").ifExists().execute();
}

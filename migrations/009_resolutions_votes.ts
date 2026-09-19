import { Kysely, sql } from "kysely";

/**
 * resolutions + votes (build spec §4.9, §4.10).
 * The one-vote-per-member-per-resolution rule is enforced by a UNIQUE constraint at
 * the DB — not app logic (this is a correctness upgrade over the Base44 spec).
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("resolutions")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("title", "text", (c) => c.notNull())
    .addColumn("description", "text")
    .addColumn("options", sql`text[]`, (c) =>
      c.notNull().defaultTo(sql`ARRAY['For','Against','Abstain']::text[]`),
    )
    .addColumn("status", sql`resolution_status`, (c) => c.notNull().defaultTo("draft"))
    .addColumn("opens_on", "date")
    .addColumn("closes_on", "date")
    .addColumn("created_at", sql`timestamptz`, (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("created_by", "uuid", (c) => c.references("users.id"))
    .execute();

  await db.schema
    .createTable("votes")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("resolution_id", "uuid", (c) =>
      c.notNull().references("resolutions.id").onDelete("cascade"),
    )
    .addColumn("member_id", "uuid", (c) =>
      c.notNull().references("users.id").onDelete("restrict"),
    )
    .addColumn("choice", "text", (c) => c.notNull())
    .addColumn("created_at", sql`timestamptz`, (c) => c.notNull().defaultTo(sql`now()`))
    // One vote per member per resolution — enforced by the database.
    .addUniqueConstraint("votes_one_per_member_per_resolution", [
      "resolution_id",
      "member_id",
    ])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("votes").ifExists().execute();
  await db.schema.dropTable("resolutions").ifExists().execute();
}

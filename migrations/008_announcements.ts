import { Kysely, sql } from "kysely";

/** announcements / documents (build spec §4.8). Officers post; members read per audience. */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("announcements")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("title", "text", (c) => c.notNull())
    .addColumn("body", "text")
    .addColumn("category", sql`announcement_category`, (c) =>
      c.notNull().defaultTo("notice"),
    )
    .addColumn("file_url", "text")
    .addColumn("is_policy", "boolean", (c) => c.notNull().defaultTo(false))
    .addColumn("audience", sql`announcement_audience`, (c) =>
      c.notNull().defaultTo("all"),
    )
    .addColumn("created_at", sql`timestamptz`, (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("created_by", "uuid", (c) => c.references("users.id"))
    .execute();

  await db.schema
    .createIndex("announcements_audience_idx")
    .on("announcements")
    .column("audience")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("announcements").ifExists().execute();
}

import { Kysely, sql } from "kysely";

/** investment_opportunities + investment_subscriptions (build spec §4.5, §4.6). */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("investment_opportunities")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("title", "text", (c) => c.notNull())
    .addColumn("description", "text")
    .addColumn("asset_class", sql`asset_class`, (c) => c.notNull())
    .addColumn("risk_level", sql`risk_level`, (c) => c.notNull())
    .addColumn("min_subscription", sql`numeric(14, 2)`, (c) =>
      c.check(sql`min_subscription >= 0`),
    )
    .addColumn("target_amount", sql`numeric(14, 2)`, (c) =>
      c.check(sql`target_amount >= 0`),
    )
    .addColumn("raised_amount", sql`numeric(14, 2)`, (c) => c.notNull().defaultTo(0))
    .addColumn("disclosure_url", "text")
    .addColumn("status", sql`opportunity_status`, (c) => c.notNull().defaultTo("draft"))
    .addColumn("opens_on", "date")
    .addColumn("closes_on", "date")
    .addColumn("created_at", sql`timestamptz`, (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("created_by", "uuid", (c) => c.references("users.id"))
    .execute();

  await db.schema
    .createTable("investment_subscriptions")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("opportunity_id", "uuid", (c) =>
      c.notNull().references("investment_opportunities.id").onDelete("restrict"),
    )
    .addColumn("member_id", "uuid", (c) =>
      c.notNull().references("users.id").onDelete("restrict"),
    )
    .addColumn("amount", sql`numeric(14, 2)`, (c) => c.notNull().check(sql`amount >= 0`))
    .addColumn("units", sql`numeric(18, 4)`, (c) => c.notNull().defaultTo(0))
    .addColumn("status", sql`subscription_status`, (c) =>
      c.notNull().defaultTo("requested"),
    )
    .addColumn("risk_acknowledged", "boolean", (c) => c.notNull().defaultTo(false))
    .addColumn("created_at", sql`timestamptz`, (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("created_by", "uuid", (c) => c.references("users.id"))
    .execute();

  await db.schema
    .createIndex("subscriptions_member_idx")
    .on("investment_subscriptions")
    .columns(["member_id", "status"])
    .execute();
  await db.schema
    .createIndex("subscriptions_opportunity_idx")
    .on("investment_subscriptions")
    .column("opportunity_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("investment_subscriptions").ifExists().execute();
  await db.schema.dropTable("investment_opportunities").ifExists().execute();
}

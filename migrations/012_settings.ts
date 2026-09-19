import { Kysely, sql } from "kysely";

/**
 * settings — key/value config the General Assembly can change without a deploy
 * (build spec §10): approval thresholds, tier amounts, loan-book liquidity cap, etc.
 * Store amounts as text and parse where used, to keep this table type-agnostic.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("settings")
    .addColumn("key", "text", (c) => c.primaryKey())
    .addColumn("value", "text", (c) => c.notNull())
    .addColumn("description", "text")
    .addColumn("updated_at", sql`timestamptz`, (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  // Illustrative defaults — TO BE SET by the General Assembly after the affordability
  // survey (build spec §14). These are placeholders, not adopted figures.
  await db
    .insertInto("settings")
    .values([
      { key: "welfare_second_approval_threshold_ngn", value: "50000", description: "Welfare payout above this (NGN) needs a second approval." },
      { key: "loan_book_liquidity_cap_pct", value: "65", description: "Max % of the savings pool the total loan book may reach." },
      { key: "tier_basic_ngn", value: "10000", description: "Indicative monthly contribution — Basic." },
      { key: "tier_standard_ngn", value: "25000", description: "Indicative monthly contribution — Standard." },
      { key: "tier_growth_ngn", value: "50000", description: "Indicative monthly contribution — Growth." },
      { key: "tier_investor_ngn", value: "100000", description: "Indicative monthly contribution — Investor (100,000+)." },
    ])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("settings").ifExists().execute();
}

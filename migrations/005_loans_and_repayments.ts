import { Kysely, sql } from "kysely";

/** loans + loan_repayments (build spec §4.3, §4.4). Dual-approval is enforced via migrations/010. */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("loans")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("member_id", "uuid", (c) =>
      c.notNull().references("users.id").onDelete("restrict"),
    )
    .addColumn("amount", sql`numeric(14, 2)`, (c) => c.notNull().check(sql`amount >= 0`))
    .addColumn("purpose", "text", (c) => c.notNull())
    .addColumn("tenor_months", "integer", (c) =>
      c.check(sql`tenor_months between 1 and 36`),
    )
    .addColumn("interest_rate", sql`numeric(6, 3)`)
    .addColumn("status", sql`loan_status`, (c) => c.notNull().defaultTo("applied"))
    .addColumn("approval_count", "integer", (c) => c.notNull().defaultTo(0))
    .addColumn("disbursed_date", "date")
    .addColumn("outstanding_balance", sql`numeric(14, 2)`, (c) =>
      c.notNull().defaultTo(0),
    )
    .addColumn("decision_notes", "text") // OFFICER-ONLY — never select for a member client
    .addColumn("created_at", sql`timestamptz`, (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("created_by", "uuid", (c) => c.references("users.id"))
    .execute();

  await db.schema
    .createIndex("loans_member_idx")
    .on("loans")
    .columns(["member_id", "status"])
    .execute();

  await db.schema
    .createTable("loan_repayments")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("loan_id", "uuid", (c) =>
      c.notNull().references("loans.id").onDelete("cascade"),
    )
    .addColumn("member_id", "uuid", (c) =>
      c.notNull().references("users.id").onDelete("restrict"),
    )
    .addColumn("amount", sql`numeric(14, 2)`, (c) => c.notNull().check(sql`amount >= 0`))
    .addColumn("paid_date", "date")
    .addColumn("method", sql`loan_repayment_method`)
    .addColumn("status", sql`loan_repayment_status`, (c) =>
      c.notNull().defaultTo("pending"),
    )
    .addColumn("created_at", sql`timestamptz`, (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("loan_repayments_loan_idx")
    .on("loan_repayments")
    .column("loan_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("loan_repayments").ifExists().execute();
  await db.schema.dropTable("loans").ifExists().execute();
}

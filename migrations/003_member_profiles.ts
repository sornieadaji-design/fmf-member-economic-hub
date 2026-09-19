import { Kysely, sql } from "kysely";

/** member_profiles — 1:1 extension of the auth user with FMF fields (build spec §4.1). */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("member_profiles")
    .addColumn("user_id", "uuid", (c) =>
      c.primaryKey().references("users.id").onDelete("cascade"),
    )
    .addColumn("fmf_member_id", "text", (c) => c.unique())
    .addColumn("phone", "text")
    .addColumn("participation_option", sql`participation_option`, (c) =>
      c.notNull().defaultTo("information_only"),
    )
    .addColumn("membership_category", sql`membership_category`, (c) =>
      c.notNull().defaultTo("active"),
    )
    .addColumn("tier", sql`tier`, (c) => c.notNull().defaultTo("none"))
    .addColumn("monthly_contribution", sql`numeric(14, 2)`, (c) =>
      c.notNull().defaultTo(0),
    )
    .addColumn("payment_frequency", sql`payment_frequency`, (c) =>
      c.notNull().defaultTo("monthly"),
    )
    .addColumn("staff_role", sql`staff_role`, (c) => c.notNull().defaultTo("member"))
    .addColumn("role", sql`user_role`, (c) => c.notNull().defaultTo("member"))
    .addColumn("kyc_status", sql`kyc_status`, (c) =>
      c.notNull().defaultTo("not_started"),
    )
    .addColumn("kyc_document_url", "text")
    .addColumn("onboarding_status", sql`onboarding_status`, (c) =>
      c.notNull().defaultTo("registered"),
    )
    .addColumn("consent_accepted", "boolean", (c) => c.notNull().defaultTo(false))
    .addColumn("consent_date", sql`timestamptz`)
    .addColumn("status", sql`member_status`, (c) => c.notNull().defaultTo("active"))
    .addColumn("created_at", sql`timestamptz`, (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("member_profiles_role_idx")
    .on("member_profiles")
    .column("role")
    .execute();
  await db.schema
    .createIndex("member_profiles_onboarding_idx")
    .on("member_profiles")
    .column("onboarding_status")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("member_profiles").ifExists().execute();
}

import "./_env";
import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { Database } from "../lib/db/types";
import { formatMemberId } from "../lib/utils/format";

/**
 * Seed DEMO data for local development and the pilot pass. Clearly-marked demo emails
 * so they are easy to delete before launch (pre-publish checklist, build spec §12).
 *
 * ⚠️ Never run against production, and REMOVE all of this before real members join.
 * Real sign-in is Google OAuth; these seeded users exist only to exercise flows/tests.
 */
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
  }
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: process.env.DATABASE_URL }),
    }),
  });

  console.log("Seeding demo data…");

  // Two officers (for the dual-approval test) + one ordinary member.
  const [officerA, officerB, member] = await db
    .insertInto("users")
    .values([
      { name: "Officer A (Treasurer, DEMO)", email: "officer.a@demo.fmf" },
      { name: "Officer B (Loan Officer, DEMO)", email: "officer.b@demo.fmf" },
      { name: "Blessing Member (DEMO)", email: "blessing@demo.fmf" },
    ])
    .returning("id")
    .execute();

  await db
    .insertInto("member_profiles")
    .values([
      {
        user_id: officerA!.id,
        fmf_member_id: formatMemberId(1),
        role: "admin",
        staff_role: "treasurer",
        onboarding_status: "active",
        participation_option: "both",
      },
      {
        user_id: officerB!.id,
        fmf_member_id: formatMemberId(2),
        role: "admin",
        staff_role: "loan_officer",
        onboarding_status: "active",
        participation_option: "both",
      },
      {
        user_id: member!.id,
        fmf_member_id: formatMemberId(3),
        role: "member",
        staff_role: "member",
        onboarding_status: "active",
        participation_option: "both",
        tier: "standard",
        monthly_contribution: 25000,
        kyc_status: "verified",
      },
    ])
    .execute();

  // Advance the member-id sequence past the seeded FMF-0001..0003 so the first REAL
  // member who finishes onboarding gets a free id instead of colliding with demo data.
  await sql`select setval('fmf_member_seq', 3)`.execute(db);

  // A confirmed savings contribution + a pending one (to test officer confirmation).
  await db
    .insertInto("contributions")
    .values([
      { member_id: member!.id, type: "savings", amount: 25000, period: "2026-08", status: "confirmed", confirmed_by: officerA!.id, method: "bank_transfer" },
      { member_id: member!.id, type: "savings", amount: 25000, period: "2026-09", status: "pending", method: "bank_transfer", payment_reference: "DEMO-REF-0001" },
    ])
    .execute();

  // The seeded ₦80,000 loan for the dual-approval headline check (build spec §12).
  await db
    .insertInto("loans")
    .values({
      member_id: member!.id,
      amount: 80000,
      purpose: "DEMO — dual-approval test",
      tenor_months: 6,
      interest_rate: 5,
      status: "applied",
    })
    .execute();

  // Demo governance content so Notices/Investments aren't empty in the pilot.
  await db
    .insertInto("announcements")
    .values({
      title: "DEMO — Welcome to the FMF Economic Hub pilot",
      body: "This is a demo announcement. Officers post notices, policies and meeting updates here.",
      category: "notice",
      audience: "all",
      created_by: officerA!.id,
    })
    .execute();

  await db
    .insertInto("resolutions")
    .values({
      title: "DEMO — Ratify the pilot phase",
      description: "A demo resolution for the pilot. Members vote once each.",
      options: ["For", "Against", "Abstain"],
      status: "open",
      created_by: officerA!.id,
    })
    .execute();

  await db
    .insertInto("investment_opportunities")
    .values({
      title: "DEMO — Money market placement",
      description: "A demo opportunity. Investments carry risk; returns are not guaranteed.",
      asset_class: "money_market",
      risk_level: "low_moderate",
      min_subscription: 50000,
      status: "open",
      created_by: officerA!.id,
    })
    .execute();

  console.log("Seed complete. Demo accounts:");
  console.log("  officer.a@demo.fmf (admin / treasurer)");
  console.log("  officer.b@demo.fmf (admin / loan_officer)");
  console.log("  blessing@demo.fmf  (member)");
  console.log("Remember: delete all demo data before launch (pre-publish checklist).");

  await db.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

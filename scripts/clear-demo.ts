import "./_env";
import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { Database } from "../lib/db/types";

/**
 * Remove ALL demo/seed data before launch (build spec §12 pre-publish checklist).
 *
 * ⚠️ DESTRUCTIVE. Run only against the pilot/dev database, never a live members database,
 * and only when you intend to wipe demo records. It targets clearly-marked demo data:
 *   - users with an @demo.fmf email (and their profiles/records)
 *   - announcements / resolutions / opportunities whose title starts with "DEMO —"
 *
 * Note on the audit log: audit_logs is append-only and references actor_id, so a demo
 * OFFICER who performed actions during the pilot cannot be deleted (their audit rows
 * remain, by design). The script reports any such users instead of failing.
 */
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool: new Pool({ connectionString: process.env.DATABASE_URL }) }) });

  const demoUsers = await db.selectFrom("users").select(["id"]).where("email", "like", "%@demo.fmf").execute();
  const demoIds = demoUsers.map((u) => u.id);
  console.log(`Found ${demoIds.length} demo user(s).`);

  const demoOpps = await db.selectFrom("investment_opportunities").select(["id"]).where("title", "like", "DEMO —%").execute();
  const demoOppIds = demoOpps.map((o) => o.id);
  const demoRes = await db.selectFrom("resolutions").select(["id"]).where("title", "like", "DEMO —%").execute();
  const demoResIds = demoRes.map((r) => r.id);

  await db.transaction().execute(async (tx) => {
    if (demoIds.length) {
      await tx.deleteFrom("votes").where("member_id", "in", demoIds).execute();
      await tx.deleteFrom("approvals").where("approver_id", "in", demoIds).execute();
      await tx.deleteFrom("loan_repayments").where("member_id", "in", demoIds).execute();
      await tx.deleteFrom("loans").where("member_id", "in", demoIds).execute();
      await tx.deleteFrom("investment_subscriptions").where("member_id", "in", demoIds).execute();
      await tx.deleteFrom("contributions").where("member_id", "in", demoIds).execute();
      await tx.deleteFrom("welfare_claims").where("member_id", "in", demoIds).execute();
    }
    if (demoResIds.length) {
      await tx.deleteFrom("votes").where("resolution_id", "in", demoResIds).execute();
      await tx.deleteFrom("resolutions").where("id", "in", demoResIds).execute();
    }
    if (demoOppIds.length) {
      await tx.deleteFrom("investment_subscriptions").where("opportunity_id", "in", demoOppIds).execute();
      await tx.deleteFrom("investment_opportunities").where("id", "in", demoOppIds).execute();
    }
    await tx.deleteFrom("announcements").where("title", "like", "DEMO —%").execute();
    if (demoIds.length) {
      await tx.deleteFrom("member_profiles").where("user_id", "in", demoIds).execute();
    }
  });

  // Delete demo users last, one by one, so audit-referenced ones are reported not fatal.
  const blocked: string[] = [];
  for (const id of demoIds) {
    try {
      await db.deleteFrom("users").where("id", "=", id).execute();
    } catch {
      blocked.push(id);
    }
  }

  console.log("Demo financial and content records removed.");
  if (blocked.length) {
    console.log(`${blocked.length} demo user(s) kept because they appear in the immutable audit log:`);
    blocked.forEach((id) => console.log(`  - ${id}`));
    console.log("This is expected; consider marking them inactive rather than deleting.");
  } else {
    console.log("All demo users removed.");
  }

  await db.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

/**
 * Phase-2 scheduled reminders: runReminders flags active members with unverified KYC and
 * active cooperative/both members with no savings contribution for the current period.
 * Emails no-op without RESEND_API_KEY, so this just checks the selection logic. DB-gated.
 */

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("runReminders", () => {
  let db: typeof import("@/lib/db").db;
  let runReminders: typeof import("@/lib/reminders").runReminders;
  const suffix = randomUUID();
  let userId = "";

  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    ({ runReminders } = await import("@/lib/reminders"));
    const u = await db.insertInto("users").values({ email: `rem-${suffix}@itest.fmf`, name: "Reminder ITest" }).returning("id").executeTakeFirstOrThrow();
    userId = u.id;
    await db.insertInto("member_profiles").values({
      user_id: userId,
      onboarding_status: "active",
      kyc_status: "not_started",
      participation_option: "both",
    }).execute();
  });

  afterAll(async () => {
    await db.deleteFrom("member_profiles").where("user_id", "=", userId).execute();
    await db.deleteFrom("users").where("id", "=", userId).execute();
    await db.destroy();
  });

  it("flags an unverified, unpaid active member for both reminders", async () => {
    const res = await runReminders();
    expect(res.kyc).toContain(userId);
    expect(res.contributionsDue).toContain(userId);
  });

  it("stops flagging the contribution reminder once a savings contribution exists for this period", async () => {
    const period = new Date().toISOString().slice(0, 7);
    await db.insertInto("contributions").values({
      member_id: userId, created_by: userId, type: "savings", amount: 1000, period, status: "pending", method: "bank_transfer",
    }).execute();

    const res = await runReminders();
    expect(res.contributionsDue).not.toContain(userId);
    // KYC still unverified, so that reminder still fires.
    expect(res.kyc).toContain(userId);

    await db.deleteFrom("contributions").where("member_id", "=", userId).execute();
  });
});

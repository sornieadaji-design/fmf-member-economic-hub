import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

/**
 * Phase 8 guardrails (build spec §6.8, §7.2, §7.5), against the real database:
 *   - contribution confirmation is officer-only; a member cannot confirm (even their own);
 *   - confirming writes an immutable audit row;
 *   - audit_logs rejects UPDATE and DELETE for anyone.
 *
 * Reuses deterministic users (audit rows reference them, so they aren't deleted); a fresh
 * pending contribution is created per run and cleaned up.
 */

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("admin console guardrails", () => {
  let db: typeof import("@/lib/db").db;
  let confirmContribution: typeof import("@/lib/actions/admin/contributions").confirmContribution;

  let memberId = "";
  let officerId = "";
  let contributionId = "";

  function session(userId: string, role: "admin" | "member", staffRole: string) {
    return { user: { id: userId, email: "x@itest.fmf", role, staffRole, onboardingStatus: "active", fmfMemberId: null } };
  }
  async function upsertUser(email: string, name: string) {
    await db.insertInto("users").values({ email, name }).onConflict((oc) => oc.column("email").doNothing()).execute();
    return (await db.selectFrom("users").select("id").where("email", "=", email).executeTakeFirstOrThrow()).id;
  }
  async function upsertProfile(userId: string, role: "admin" | "member", staffRole: string) {
    await db
      .insertInto("member_profiles")
      .values({ user_id: userId, role, staff_role: staffRole as never, onboarding_status: "active" })
      .onConflict((oc) => oc.column("user_id").doUpdateSet({ role, staff_role: staffRole as never }))
      .execute();
  }

  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    ({ confirmContribution } = await import("@/lib/actions/admin/contributions"));

    memberId = await upsertUser("admin-itest-member@itest.fmf", "Admin ITest Member");
    officerId = await upsertUser("admin-itest-officer@itest.fmf", "Admin ITest Officer");
    await upsertProfile(memberId, "member", "member");
    await upsertProfile(officerId, "admin", "treasurer");

    const c = await db
      .insertInto("contributions")
      .values({ member_id: memberId, created_by: memberId, type: "savings", amount: 5000, status: "pending", method: "bank_transfer" })
      .returning("id")
      .executeTakeFirstOrThrow();
    contributionId = c.id;
  });

  afterAll(async () => {
    if (contributionId) await db.deleteFrom("contributions").where("id", "=", contributionId).execute();
    await db.destroy();
  });

  it("refuses a member confirming a contribution (even their own)", async () => {
    mockAuth.mockResolvedValue(session(memberId, "member", "member"));
    await expect(confirmContribution(contributionId)).rejects.toBeTruthy();
    const row = await db.selectFrom("contributions").select(["status"]).where("id", "=", contributionId).executeTakeFirstOrThrow();
    expect(row.status).toBe("pending");
  });

  it("lets an officer confirm, writing an audit row", async () => {
    mockAuth.mockResolvedValue(session(officerId, "admin", "treasurer"));
    const res = await confirmContribution(contributionId);
    expect(res.ok).toBe(true);
    const row = await db.selectFrom("contributions").select(["status", "confirmed_by"]).where("id", "=", contributionId).executeTakeFirstOrThrow();
    expect(row.status).toBe("confirmed");
    expect(row.confirmed_by).toBe(officerId);

    const audit = await db
      .selectFrom("audit_logs")
      .select(["id"])
      .where("action", "=", "contribution.confirm")
      .where("entity_id", "=", contributionId)
      .execute();
    expect(audit.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects UPDATE and DELETE on audit_logs (append-only)", async () => {
    const row = await db
      .selectFrom("audit_logs")
      .select(["id"])
      .where("entity_id", "=", contributionId)
      .executeTakeFirstOrThrow();

    await expect(
      db.updateTable("audit_logs").set({ action: "tampered" }).where("id", "=", row.id).execute(),
    ).rejects.toBeTruthy();

    await expect(
      db.deleteFrom("audit_logs").where("id", "=", row.id).execute(),
    ).rejects.toBeTruthy();
  });
});

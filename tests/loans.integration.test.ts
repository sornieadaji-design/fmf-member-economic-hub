import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

/**
 * Phase 6 headline guardrail (CLAUDE.md §3.2, build spec §7.3): the loan dual-approval
 * workflow, proven against the real database.
 *   - one officer's approval never reaches `approved`;
 *   - the SAME officer approving twice does not advance it (unique constraint);
 *   - two DISTINCT officers do advance it to `approved`;
 *   - a member cannot record an approval at all.
 *
 * Reuses deterministic test officers (audit_logs is append-only and references users, so
 * users can't be deleted); each run uses a fresh loan and cleans up only that loan and
 * its approvals. DB-gated: skips when DATABASE_URL is unset.
 */

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("loan dual-approval", () => {
  let db: typeof import("@/lib/db").db;
  let recordLoanApproval: typeof import("@/lib/actions/loans").recordLoanApproval;

  let memberId = "";
  let officerAId = "";
  let officerBId = "";
  let loanId = "";

  function session(userId: string, role: "admin" | "member", staffRole: string) {
    return {
      user: { id: userId, email: "x@itest.fmf", role, staffRole, onboardingStatus: "active", fmfMemberId: null },
    };
  }

  async function upsertUser(email: string, name: string) {
    await db.insertInto("users").values({ email, name }).onConflict((oc) => oc.column("email").doNothing()).execute();
    const row = await db.selectFrom("users").select("id").where("email", "=", email).executeTakeFirstOrThrow();
    return row.id;
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
    ({ recordLoanApproval } = await import("@/lib/actions/loans"));

    memberId = await upsertUser("loan-member@itest.fmf", "Loan Member (itest)");
    officerAId = await upsertUser("loan-officer-a@itest.fmf", "Loan Officer A (itest)");
    officerBId = await upsertUser("loan-officer-b@itest.fmf", "Loan Officer B (itest)");
    await upsertProfile(memberId, "member", "member");
    await upsertProfile(officerAId, "admin", "loan_officer");
    await upsertProfile(officerBId, "admin", "treasurer");

    const loan = await db
      .insertInto("loans")
      .values({ member_id: memberId, created_by: memberId, amount: 80000, purpose: "itest dual-approval", tenor_months: 6, status: "applied", outstanding_balance: 0 })
      .returning("id")
      .executeTakeFirstOrThrow();
    loanId = loan.id;
  });

  afterAll(async () => {
    if (loanId) {
      await db.deleteFrom("approvals").where("target_entity", "=", "loan").where("target_id", "=", loanId).execute();
      await db.deleteFrom("loans").where("id", "=", loanId).execute();
    }
    await db.destroy();
  });

  it("does not reach 'approved' on one officer's approval", async () => {
    mockAuth.mockResolvedValue(session(officerAId, "admin", "loan_officer"));
    const res = await recordLoanApproval({ loanId, decision: "approved", comment: "" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.approvals).toBe(1);
      expect(res.status).toBe("under_review");
    }
    const loan = await db.selectFrom("loans").select(["status", "approval_count"]).where("id", "=", loanId).executeTakeFirstOrThrow();
    expect(loan.status).toBe("under_review");
    expect(loan.approval_count).toBe(1);
  });

  it("blocks the SAME officer from approving twice", async () => {
    mockAuth.mockResolvedValue(session(officerAId, "admin", "loan_officer"));
    const res = await recordLoanApproval({ loanId, decision: "approved", comment: "" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/different officer/i);
    const loan = await db.selectFrom("loans").select(["status", "approval_count"]).where("id", "=", loanId).executeTakeFirstOrThrow();
    expect(loan.status).toBe("under_review");
    expect(loan.approval_count).toBe(1);
  });

  it("reaches 'approved' when a SECOND, distinct officer approves", async () => {
    mockAuth.mockResolvedValue(session(officerBId, "admin", "treasurer"));
    const res = await recordLoanApproval({ loanId, decision: "approved", comment: "" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.approvals).toBe(2);
      expect(res.status).toBe("approved");
    }
    const loan = await db.selectFrom("loans").select(["status", "approval_count"]).where("id", "=", loanId).executeTakeFirstOrThrow();
    expect(loan.status).toBe("approved");
    expect(loan.approval_count).toBe(2);
  });

  it("refuses a member (non-officer) recording an approval", async () => {
    mockAuth.mockResolvedValue(session(memberId, "member", "member"));
    await expect(recordLoanApproval({ loanId, decision: "approved", comment: "" })).rejects.toBeTruthy();
  });

  it("writes an audit row for the approvals (append-only, immutable)", async () => {
    const rows = await db
      .selectFrom("audit_logs")
      .select(["action"])
      .where("entity", "=", "loans")
      .where("entity_id", "=", loanId)
      .where("action", "=", "loan.approve")
      .execute();
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});

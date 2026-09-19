import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

/**
 * Phase 5 guardrails (build spec §6.2, §6.3, §7.6), proven against the real database:
 *   1. A member can read only their OWN contributions — never another member's.
 *   2. The dashboard summary keeps every fund pool separate — no merged cross-pool total.
 *
 * DB-gated: skips cleanly when DATABASE_URL is not set. Creates two throwaway members
 * with unique emails and removes them (and their contributions) afterwards.
 */

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("contributions ownership + pool separation", () => {
  let db: typeof import("@/lib/db").db;
  let listMyContributions: typeof import("@/lib/actions/contributions").listMyContributions;
  let getDashboardSummary: typeof import("@/lib/actions/contributions").getDashboardSummary;

  const aId = randomUUID();
  const bId = randomUUID();
  const aEmail = `test-a-${aId}@itest.fmf`;
  const bEmail = `test-b-${bId}@itest.fmf`;
  let aUserId = "";
  let bUserId = "";

  function sessionFor(userId: string) {
    return {
      user: {
        id: userId,
        email: "x@itest.fmf",
        role: "member",
        staffRole: "member",
        onboardingStatus: "active",
        fmfMemberId: null,
      },
    };
  }

  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    ({ listMyContributions, getDashboardSummary } = await import("@/lib/actions/contributions"));

    const [a, b] = await db
      .insertInto("users")
      .values([
        { name: "ITest A", email: aEmail },
        { name: "ITest B", email: bEmail },
      ])
      .returning("id")
      .execute();
    aUserId = a!.id;
    bUserId = b!.id;

    await db
      .insertInto("member_profiles")
      .values([
        { user_id: aUserId, onboarding_status: "active", kyc_status: "verified" },
        { user_id: bUserId, onboarding_status: "active" },
      ])
      .execute();

    // Member A: savings 100 + welfare 50 (both confirmed). Member B: savings 999 (confirmed).
    await db
      .insertInto("contributions")
      .values([
        { member_id: aUserId, created_by: aUserId, type: "savings", amount: 100, status: "confirmed", method: "bank_transfer" },
        { member_id: aUserId, created_by: aUserId, type: "welfare", amount: 50, status: "confirmed", method: "bank_transfer" },
        { member_id: bUserId, created_by: bUserId, type: "savings", amount: 999, status: "confirmed", method: "bank_transfer" },
      ])
      .execute();
  });

  afterAll(async () => {
    if (!aUserId) return;
    await db.deleteFrom("contributions").where("member_id", "in", [aUserId, bUserId]).execute();
    await db.deleteFrom("member_profiles").where("user_id", "in", [aUserId, bUserId]).execute();
    await db.deleteFrom("users").where("id", "in", [aUserId, bUserId]).execute();
    await db.destroy();
  });

  it("returns only the acting member's contributions", async () => {
    mockAuth.mockResolvedValue(sessionFor(aUserId));
    const rows = await listMyContributions();
    expect(rows.length).toBe(2);
    // None of member A's rows may be the ₦999 that belongs to member B.
    expect(rows.every((r) => Number(r.amount) !== 999)).toBe(true);
    expect(rows.map((r) => r.type).sort()).toEqual(["savings", "welfare"]);
  });

  it("does not leak member B's data to member A (and vice versa)", async () => {
    mockAuth.mockResolvedValue(sessionFor(bUserId));
    const rows = await listMyContributions();
    expect(rows.length).toBe(1);
    expect(Number(rows[0]!.amount)).toBe(999);
  });

  it("keeps fund pools separate — never a merged balance", async () => {
    mockAuth.mockResolvedValue(sessionFor(aUserId));
    const summary = await getDashboardSummary();
    expect(summary.confirmedSavings).toBe(100);
    expect(summary.confirmedWelfare).toBe(50);
    // The merged total (150) must not appear as any field in the summary.
    expect(Object.values(summary)).not.toContain(150);
  });
});

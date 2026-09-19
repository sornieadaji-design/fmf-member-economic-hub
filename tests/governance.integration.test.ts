import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

/**
 * Phase 7 guardrails (build spec §6.5–§6.7), against the real database:
 *   - a cooperative-only member cannot see or subscribe to the investment room;
 *   - no investment view exposes a projected/guaranteed return figure;
 *   - a member can vote at most once per resolution (DB unique constraint).
 *
 * DB-gated; creates throwaway rows with unique ids and cleans them up.
 */

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

const hasDb = Boolean(process.env.DATABASE_URL);

function sessionFor(userId: string) {
  return {
    user: { id: userId, email: "x@itest.fmf", role: "member", staffRole: "member", onboardingStatus: "active", fmfMemberId: null },
  };
}

describe.runIf(hasDb)("Phase 7 governance guardrails", () => {
  let db: typeof import("@/lib/db").db;
  let inv: typeof import("@/lib/actions/investments");
  let notices: typeof import("@/lib/actions/notices");

  const suffix = randomUUID();
  let coopUserId = "";
  let invUserId = "";
  let oppId = "";
  let openResId = "";

  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    inv = await import("@/lib/actions/investments");
    notices = await import("@/lib/actions/notices");

    const [coop, invu] = await db
      .insertInto("users")
      .values([
        { name: "Coop Only", email: `coop-${suffix}@itest.fmf` },
        { name: "Investor", email: `inv-${suffix}@itest.fmf` },
      ])
      .returning("id")
      .execute();
    coopUserId = coop!.id;
    invUserId = invu!.id;

    await db
      .insertInto("member_profiles")
      .values([
        { user_id: coopUserId, onboarding_status: "active", participation_option: "cooperative" },
        { user_id: invUserId, onboarding_status: "active", participation_option: "both" },
      ])
      .execute();

    const opp = await db
      .insertInto("investment_opportunities")
      .values({
        title: `itest opportunity ${suffix}`,
        asset_class: "money_market",
        risk_level: "moderate",
        min_subscription: 1000,
        status: "open",
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    oppId = opp.id;

    const res = await db
      .insertInto("resolutions")
      .values({
        title: `itest resolution ${suffix}`,
        options: ["For", "Against", "Abstain"],
        status: "open",
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    openResId = res.id;
  });

  afterAll(async () => {
    await db.deleteFrom("investment_subscriptions").where("opportunity_id", "=", oppId).execute();
    await db.deleteFrom("investment_opportunities").where("id", "=", oppId).execute();
    await db.deleteFrom("votes").where("resolution_id", "=", openResId).execute();
    await db.deleteFrom("resolutions").where("id", "=", openResId).execute();
    await db.deleteFrom("member_profiles").where("user_id", "in", [coopUserId, invUserId]).execute();
    await db.deleteFrom("users").where("id", "in", [coopUserId, invUserId]).execute();
    await db.destroy();
  });

  it("hides the investment room from a cooperative-only member", async () => {
    mockAuth.mockResolvedValue(sessionFor(coopUserId));
    expect(await inv.isInvestmentMember()).toBe(false);
    expect(await inv.listOpenOpportunities()).toEqual([]);
  });

  it("refuses a cooperative-only member subscribing", async () => {
    mockAuth.mockResolvedValue(sessionFor(coopUserId));
    const res = await inv.subscribeToOpportunity({ opportunityId: oppId, amount: 5000, riskAcknowledged: true });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/not enrolled/i);
  });

  it("lets an investment member subscribe, and never exposes a return figure", async () => {
    mockAuth.mockResolvedValue(sessionFor(invUserId));
    const opps = await inv.listOpenOpportunities();
    expect(opps.length).toBeGreaterThanOrEqual(1);
    // No key may hint at a projected/guaranteed return.
    for (const o of opps) {
      for (const key of Object.keys(o)) {
        expect(key).not.toMatch(/return|guarantee|projected|yield|roi/i);
      }
    }
    const ok = await inv.subscribeToOpportunity({ opportunityId: oppId, amount: 1000, riskAcknowledged: true });
    expect(ok.ok).toBe(true);
  });

  it("enforces the minimum subscription", async () => {
    mockAuth.mockResolvedValue(sessionFor(invUserId));
    const res = await inv.subscribeToOpportunity({ opportunityId: oppId, amount: 1, riskAcknowledged: true });
    expect(res.ok).toBe(false);
  });

  it("allows one vote per resolution and refuses a second", async () => {
    mockAuth.mockResolvedValue(sessionFor(invUserId));
    const first = await notices.castVote({ resolutionId: openResId, choice: "For" });
    expect(first.ok).toBe(true);
    const second = await notices.castVote({ resolutionId: openResId, choice: "Against" });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/already voted/i);

    const votes = await db.selectFrom("votes").select(["choice"]).where("resolution_id", "=", openResId).where("member_id", "=", invUserId).execute();
    expect(votes.length).toBe(1);
    expect(votes[0]!.choice).toBe("For");
  });

  it("rejects an invalid option", async () => {
    mockAuth.mockResolvedValue(sessionFor(coopUserId));
    const res = await notices.castVote({ resolutionId: openResId, choice: "Maybe" });
    expect(res.ok).toBe(false);
  });
});

"use server";

import { revalidatePath } from "next/cache";
import type { Selectable } from "kysely";
import { requireMember } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import type { Database } from "@/lib/db/types";
import { subscribeSchema, type SubscribeInput } from "@/lib/validation/governance";

/**
 * Investment room (build spec §6.5). Only members whose participation is investment|both
 * may see opportunities or subscribe. Opportunities carry a risk_level and disclosure —
 * NEVER a projected/guaranteed return (CLAUDE.md §3.6). Subscribing requires an explicit
 * risk acknowledgement and creates a `requested` subscription; allocation (Phase 8) needs
 * two officer approvals.
 */

export async function isInvestmentMember(): Promise<boolean> {
  const user = await requireMember();
  const p = await db
    .selectFrom("member_profiles")
    .select(["participation_option"])
    .where("user_id", "=", user.id)
    .executeTakeFirst();
  return p?.participation_option === "investment" || p?.participation_option === "both";
}

export type OpportunityRow = Pick<
  Selectable<Database["investment_opportunities"]>,
  "id" | "title" | "description" | "asset_class" | "risk_level" | "min_subscription" | "disclosure_url" | "closes_on"
>;

/** Open opportunities — only returned to investment-enrolled members. */
export async function listOpenOpportunities(): Promise<OpportunityRow[]> {
  if (!(await isInvestmentMember())) return [];
  return db
    .selectFrom("investment_opportunities")
    .select(["id", "title", "description", "asset_class", "risk_level", "min_subscription", "disclosure_url", "closes_on"])
    // deliberately no "raised_amount"/"target_amount" progress that could imply a return
    .where("status", "=", "open")
    .orderBy("created_at", "desc")
    .execute();
}

export type MySubscriptionRow = {
  id: string;
  amount: string;
  status: string;
  risk_acknowledged: boolean;
  title: string;
  risk_level: string;
};

export async function listMySubscriptions(): Promise<MySubscriptionRow[]> {
  const user = await requireMember();
  return db
    .selectFrom("investment_subscriptions as s")
    .innerJoin("investment_opportunities as o", "o.id", "s.opportunity_id")
    .select([
      "s.id as id",
      "s.amount as amount",
      "s.status as status",
      "s.risk_acknowledged as risk_acknowledged",
      "o.title as title",
      "o.risk_level as risk_level",
    ])
    .where("s.member_id", "=", user.id)
    .orderBy("s.created_at", "desc")
    .execute();
}

export type SubscribeResult = { ok: true } | { ok: false; error: string };

export async function subscribeToOpportunity(input: SubscribeInput): Promise<SubscribeResult> {
  const user = await requireMember();

  // Participation gate — enforced server-side, not just hidden in the UI.
  if (!(await isInvestmentMember())) {
    return { ok: false, error: "You are not enrolled in the investment club." };
  }

  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { opportunityId, amount } = parsed.data;

  const opp = await db
    .selectFrom("investment_opportunities")
    .select(["id", "status", "min_subscription"])
    .where("id", "=", opportunityId)
    .executeTakeFirst();
  if (!opp || opp.status !== "open") {
    return { ok: false, error: "This opportunity is not open for subscription." };
  }
  const min = Number(opp.min_subscription ?? 0);
  if (amount < min) {
    return { ok: false, error: `The minimum subscription is ${min}.` };
  }

  await db
    .insertInto("investment_subscriptions")
    .values({
      opportunity_id: opportunityId,
      member_id: user.id, // from session
      created_by: user.id,
      amount,
      status: "requested",
      risk_acknowledged: true,
    })
    .execute();

  revalidatePath("/investments");
  return { ok: true };
}

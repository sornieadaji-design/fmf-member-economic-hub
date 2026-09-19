"use server";

import { revalidatePath } from "next/cache";
import { sql } from "kysely";
import { requireOfficer } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { insertApprovalAndCountDistinct, isUniqueViolation } from "@/lib/actions/_approvals";
import { createOpportunitySchema, type CreateOpportunityInput } from "@/lib/validation/admin";

/**
 * Investment administration (build spec §6.8, §7.4). Officers create/open/close
 * opportunities and allocate subscriptions. Allocation needs two DISTINCT officers; on the
 * second approval the subscription becomes `allocated` and the opportunity's raised_amount
 * is updated — all in one transaction. No return figure is ever stored or shown.
 */

export type AdminResult = { ok: true } | { ok: false; error: string };

export async function createOpportunity(input: CreateOpportunityInput): Promise<AdminResult> {
  const officer = await requireOfficer("createOpportunities");
  const parsed = createOpportunitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const d = parsed.data;

  await db
    .insertInto("investment_opportunities")
    .values({
      title: d.title,
      description: d.description || null,
      asset_class: d.assetClass,
      risk_level: d.riskLevel,
      min_subscription: d.minSubscription ?? null,
      disclosure_url: d.disclosureUrl || null,
      status: "draft",
      created_by: officer.id,
    })
    .execute();

  revalidatePath("/admin/investments");
  return { ok: true };
}

export async function setOpportunityStatus(
  id: string,
  status: "draft" | "open" | "closed" | "cancelled",
): Promise<AdminResult> {
  await requireOfficer("createOpportunities");
  await db.updateTable("investment_opportunities").set({ status }).where("id", "=", id).execute();
  revalidatePath("/admin/investments");
  return { ok: true };
}

export interface AdminOpportunityRow {
  id: string;
  title: string;
  asset_class: string;
  risk_level: string;
  min_subscription: string | null;
  raised_amount: string;
  status: string;
}

export async function listOpportunitiesAdmin(): Promise<AdminOpportunityRow[]> {
  await requireOfficer();
  return db
    .selectFrom("investment_opportunities")
    .select(["id", "title", "asset_class", "risk_level", "min_subscription", "raised_amount", "status"])
    .orderBy("created_at", "desc")
    .execute();
}

export interface AdminSubscriptionRow {
  id: string;
  member_name: string | null;
  opportunity_title: string;
  amount: string;
  status: string;
  approvals: number;
}

export async function listSubscriptionsAdmin(): Promise<AdminSubscriptionRow[]> {
  await requireOfficer();
  const rows = await db
    .selectFrom("investment_subscriptions as s")
    .innerJoin("users as u", "u.id", "s.member_id")
    .innerJoin("investment_opportunities as o", "o.id", "s.opportunity_id")
    .select(["s.id as id", "u.name as member_name", "o.title as opportunity_title", "s.amount as amount", "s.status as status"])
    .orderBy("s.created_at", "desc")
    .execute();

  return Promise.all(
    rows.map(async (r) => {
      const c = await db
        .selectFrom("approvals")
        .select((eb) => eb.fn.count<string>("approver_id").distinct().as("n"))
        .where("target_entity", "=", "investment_subscription")
        .where("target_id", "=", r.id)
        .where("decision", "=", "approved")
        .executeTakeFirst();
      return { ...r, approvals: Number(c?.n ?? 0) };
    }),
  );
}

export type AllocateResult =
  | { ok: true; status: string; approvals: number }
  | { ok: false; error: string };

export async function recordSubscriptionApproval(subscriptionId: string): Promise<AllocateResult> {
  const officer = await requireOfficer("allocateInvestments");
  try {
    return await db.transaction().execute<AllocateResult>(async (tx) => {
      const sub = await tx
        .selectFrom("investment_subscriptions")
        .select(["id", "status", "amount", "opportunity_id"])
        .where("id", "=", subscriptionId)
        .executeTakeFirst();
      if (!sub) return { ok: false, error: "Subscription not found." };
      if (["allocated", "rejected", "exited"].includes(sub.status)) {
        return { ok: false, error: `This subscription is already ${sub.status}.` };
      }

      const approvals = await insertApprovalAndCountDistinct(tx, {
        entity: "investment_subscription",
        targetId: subscriptionId,
        approverId: officer.id,
        approverRole: officer.staffRole,
        decision: "approved",
      });

      if (approvals >= 2) {
        await tx.updateTable("investment_subscriptions").set({ status: "allocated" }).where("id", "=", subscriptionId).execute();
        // Update the opportunity's raised total in the SAME transaction.
        await tx
          .updateTable("investment_opportunities")
          .set({ raised_amount: sql`raised_amount + ${Number(sub.amount)}` })
          .where("id", "=", sub.opportunity_id)
          .execute();
        await writeAudit(tx, {
          actorId: officer.id,
          action: "subscription.allocate",
          entity: "investment_subscriptions",
          entityId: subscriptionId,
          details: { amount: sub.amount, opportunity_id: sub.opportunity_id },
        });
        return { ok: true, status: "allocated", approvals };
      }

      await tx.updateTable("investment_subscriptions").set({ status: "approved" }).where("id", "=", subscriptionId).execute();
      await writeAudit(tx, {
        actorId: officer.id,
        action: "subscription.approve",
        entity: "investment_subscriptions",
        entityId: subscriptionId,
        details: { distinct_approvals: approvals },
      });
      return { ok: true, status: "approved", approvals };
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, error: "You have already approved this subscription; a different officer is required." };
    }
    return { ok: false, error: "Could not record the approval." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { requireOfficer } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { insertApprovalAndCountDistinct, isUniqueViolation } from "@/lib/actions/_approvals";
import { getNumericSetting, SETTINGS_KEYS, DEFAULT_WELFARE_THRESHOLD } from "@/lib/settings";

/**
 * Welfare review (build spec §6.6, §6.8, §10). A payout AT/BELOW the policy threshold
 * needs one officer approval; ABOVE it needs two DISTINCT officers (dual-control via the
 * approvals table). Every decision writes an audit row.
 */

export interface AdminWelfareRow {
  id: string;
  member_name: string | null;
  fmf_member_id: string | null;
  category: string;
  amount_requested: string;
  reason: string | null;
  evidence_url: string | null;
  status: string;
  approvals: number;
  created_at: Date;
}

export async function listAllWelfare(): Promise<AdminWelfareRow[]> {
  await requireOfficer();
  const claims = await db
    .selectFrom("welfare_claims as w")
    .innerJoin("users as u", "u.id", "w.member_id")
    .leftJoin("member_profiles as p", "p.user_id", "w.member_id")
    .select([
      "w.id as id",
      "u.name as member_name",
      "p.fmf_member_id as fmf_member_id",
      "w.category as category",
      "w.amount_requested as amount_requested",
      "w.reason as reason",
      "w.evidence_url as evidence_url",
      "w.status as status",
      "w.created_at as created_at",
    ])
    .orderBy("w.created_at", "desc")
    .execute();

  // Attach distinct-approval counts.
  const withCounts = await Promise.all(
    claims.map(async (c) => {
      const row = await db
        .selectFrom("approvals")
        .select((eb) => eb.fn.count<string>("approver_id").distinct().as("n"))
        .where("target_entity", "=", "welfare_claim")
        .where("target_id", "=", c.id)
        .where("decision", "=", "approved")
        .executeTakeFirst();
      return { ...c, approvals: Number(row?.n ?? 0) };
    }),
  );
  return withCounts;
}

export type WelfareDecisionResult =
  | { ok: true; status: string; approvals: number; required: number }
  | { ok: false; error: string };

export async function recordWelfareDecision(
  claimId: string,
  decision: "approved" | "rejected",
): Promise<WelfareDecisionResult> {
  const officer = await requireOfficer("approveWelfare");
  const threshold = await getNumericSetting(SETTINGS_KEYS.welfareApprovalThreshold, DEFAULT_WELFARE_THRESHOLD);

  try {
    return await db.transaction().execute<WelfareDecisionResult>(async (tx) => {
      const claim = await tx
        .selectFrom("welfare_claims")
        .select(["id", "status", "amount_requested"])
        .where("id", "=", claimId)
        .executeTakeFirst();
      if (!claim) return { ok: false, error: "Claim not found." };
      if (["approved", "paid", "rejected"].includes(claim.status)) {
        return { ok: false, error: `This claim is already ${claim.status}.` };
      }

      if (decision === "rejected") {
        await insertApprovalAndCountDistinct(tx, {
          entity: "welfare_claim",
          targetId: claimId,
          approverId: officer.id,
          approverRole: officer.staffRole,
          decision,
        });
        await tx.updateTable("welfare_claims").set({ status: "rejected" }).where("id", "=", claimId).execute();
        await writeAudit(tx, { actorId: officer.id, action: "welfare.reject", entity: "welfare_claims", entityId: claimId });
        return { ok: true, status: "rejected", approvals: 0, required: 0 };
      }

      const amount = Number(claim.amount_requested);
      const required = amount > threshold ? 2 : 1;
      const approvals = await insertApprovalAndCountDistinct(tx, {
        entity: "welfare_claim",
        targetId: claimId,
        approverId: officer.id,
        approverRole: officer.staffRole,
        decision: "approved",
      });

      const status = approvals >= required ? "approved" : "under_review";
      await tx.updateTable("welfare_claims").set({ status }).where("id", "=", claimId).execute();
      await writeAudit(tx, {
        actorId: officer.id,
        action: "welfare.approve",
        entity: "welfare_claims",
        entityId: claimId,
        details: { distinct_approvals: approvals, required, resulting_status: status },
      });
      return { ok: true, status, approvals, required };
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, error: "You have already decided on this claim; a different officer is required." };
    }
    return { ok: false, error: "Could not record the decision." };
  }
}

export type PayResult = { ok: true } | { ok: false; error: string };

export async function markWelfarePaid(claimId: string): Promise<PayResult> {
  const officer = await requireOfficer("approveWelfare");
  return db.transaction().execute<PayResult>(async (tx) => {
    const claim = await tx.selectFrom("welfare_claims").select(["id", "status"]).where("id", "=", claimId).executeTakeFirst();
    if (!claim) return { ok: false, error: "Claim not found." };
    if (claim.status !== "approved") return { ok: false, error: "Claim must be approved before it is paid." };
    await tx.updateTable("welfare_claims").set({ status: "paid" }).where("id", "=", claimId).execute();
    await writeAudit(tx, { actorId: officer.id, action: "welfare.pay", entity: "welfare_claims", entityId: claimId });
    revalidatePath("/admin/welfare");
    return { ok: true };
  });
}

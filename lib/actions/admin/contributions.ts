"use server";

import { revalidatePath } from "next/cache";
import { requireOfficer } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { notifyMember } from "@/lib/email";
import { formatNGN } from "@/lib/utils/format";

/**
 * Officer contribution review (build spec §6.8, §7.2). Members NEVER confirm their own
 * payments — confirmation is officer-only and writes an audit row in the same transaction.
 */

export interface AdminContributionRow {
  id: string;
  member_name: string | null;
  fmf_member_id: string | null;
  type: string;
  amount: string;
  period: string | null;
  method: string;
  status: string;
  payment_reference: string | null;
  receipt_url: string | null;
  created_at: Date;
}

export async function listAllContributions(status?: string): Promise<AdminContributionRow[]> {
  await requireOfficer();
  let q = db
    .selectFrom("contributions as c")
    .innerJoin("users as u", "u.id", "c.member_id")
    .leftJoin("member_profiles as p", "p.user_id", "c.member_id")
    .select([
      "c.id as id",
      "u.name as member_name",
      "p.fmf_member_id as fmf_member_id",
      "c.type as type",
      "c.amount as amount",
      "c.period as period",
      "c.method as method",
      "c.status as status",
      "c.payment_reference as payment_reference",
      "c.receipt_url as receipt_url",
      "c.created_at as created_at",
    ])
    .orderBy("c.created_at", "desc");
  if (status) q = q.where("c.status", "=", status as "pending" | "confirmed" | "rejected");
  return q.execute();
}

export type ConfirmResult = { ok: true } | { ok: false; error: string };

export async function confirmContribution(id: string): Promise<ConfirmResult> {
  const officer = await requireOfficer("confirmContributions");
  const outcome = await db.transaction().execute(async (tx) => {
    const row = await tx
      .selectFrom("contributions")
      .select(["id", "status", "member_id", "amount", "type"])
      .where("id", "=", id)
      .executeTakeFirst();
    if (!row) return { ok: false as const, error: "Contribution not found." };
    if (row.status !== "pending") return { ok: false as const, error: `Already ${row.status}.` };

    await tx
      .updateTable("contributions")
      .set({ status: "confirmed", confirmed_by: officer.id, confirmed_date: new Date() })
      .where("id", "=", id)
      .where("status", "=", "pending")
      .execute();

    await writeAudit(tx, {
      actorId: officer.id,
      action: "contribution.confirm",
      entity: "contributions",
      entityId: id,
      details: { member_id: row.member_id },
    });

    return { ok: true as const, memberId: row.member_id, amount: row.amount, type: row.type };
  });

  if (!outcome.ok) return outcome;

  // Post-commit notification (never blocks or rolls back the confirmation).
  await notifyMember(
    outcome.memberId,
    "Your FMF contribution was confirmed",
    `Your ${outcome.type} contribution of ${formatNGN(outcome.amount)} has been confirmed by an officer.`,
  );
  revalidatePath("/admin/contributions");
  return { ok: true };
}

export async function rejectContribution(id: string): Promise<ConfirmResult> {
  const officer = await requireOfficer("confirmContributions");
  return db.transaction().execute<ConfirmResult>(async (tx) => {
    const row = await tx.selectFrom("contributions").select(["id", "status"]).where("id", "=", id).executeTakeFirst();
    if (!row) return { ok: false, error: "Contribution not found." };
    if (row.status !== "pending") return { ok: false, error: `Already ${row.status}.` };

    await tx.updateTable("contributions").set({ status: "rejected", confirmed_by: officer.id }).where("id", "=", id).execute();
    await writeAudit(tx, { actorId: officer.id, action: "contribution.reject", entity: "contributions", entityId: id });

    revalidatePath("/admin/contributions");
    return { ok: true };
  });
}

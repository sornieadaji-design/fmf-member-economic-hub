"use server";

import { revalidatePath } from "next/cache";
import type { Selectable } from "kysely";
import { requireMember } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import type { Database } from "@/lib/db/types";
import { welfareClaimSchema, type WelfareClaimInput } from "@/lib/validation/governance";

/**
 * Welfare claims (build spec §6.6). A member submits and tracks their own claims;
 * officer review + the second-approval-above-threshold rule live in the admin console
 * (Phase 8). Ownership is always the session member.
 */

export type MyWelfareRow = Pick<
  Selectable<Database["welfare_claims"]>,
  "id" | "category" | "amount_requested" | "reason" | "status" | "created_at"
>;

export async function listMyWelfareClaims(): Promise<MyWelfareRow[]> {
  const user = await requireMember();
  return db
    .selectFrom("welfare_claims")
    .select(["id", "category", "amount_requested", "reason", "status", "created_at"])
    .where("member_id", "=", user.id)
    .orderBy("created_at", "desc")
    .execute();
}

export type WelfareResult = { ok: true } | { ok: false; error: string };

export async function submitWelfareClaim(input: WelfareClaimInput): Promise<WelfareResult> {
  const user = await requireMember();
  const parsed = welfareClaimSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { category, amountRequested, reason, evidenceUrl } = parsed.data;

  await db
    .insertInto("welfare_claims")
    .values({
      member_id: user.id, // from session
      created_by: user.id,
      category,
      amount_requested: amountRequested,
      reason,
      evidence_url: evidenceUrl || null,
      status: "submitted",
    })
    .execute();

  revalidatePath("/welfare");
  return { ok: true };
}

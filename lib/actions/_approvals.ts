import type { Transaction } from "kysely";
import type { Database } from "@/lib/db/types";

export const PG_UNIQUE_VIOLATION = "23505";
export function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === PG_UNIQUE_VIOLATION;
}

type ApprovalEntity = "loan" | "investment_subscription" | "welfare_claim" | "contribution";

/**
 * Insert one officer's approval for a target and return the count of DISTINCT approving
 * officers. Call INSIDE a transaction; a repeat by the same officer throws 23505 (unique
 * constraint approvals_one_per_officer_per_target) which the caller catches. This is the
 * shared engine behind welfare/investment dual-control (loans has its own tested copy).
 */
export async function insertApprovalAndCountDistinct(
  tx: Transaction<Database>,
  args: {
    entity: ApprovalEntity;
    targetId: string;
    approverId: string;
    approverRole: string | null;
    decision: "approved" | "rejected";
    comment?: string | null;
  },
): Promise<number> {
  await tx
    .insertInto("approvals")
    .values({
      target_entity: args.entity,
      target_id: args.targetId,
      approver_id: args.approverId,
      approver_role: args.approverRole,
      decision: args.decision,
      comment: args.comment ?? null,
    })
    .execute();

  if (args.decision !== "approved") return 0;

  const row = await tx
    .selectFrom("approvals")
    .select((eb) => eb.fn.count<string>("approver_id").distinct().as("c"))
    .where("target_entity", "=", args.entity)
    .where("target_id", "=", args.targetId)
    .where("decision", "=", "approved")
    .executeTakeFirst();
  return Number(row?.c ?? 0);
}

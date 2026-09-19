"use server";

import { revalidatePath } from "next/cache";
import type { Selectable } from "kysely";
import { requireMember, requireOfficer } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import type { Database } from "@/lib/db/types";
import { writeAudit } from "@/lib/audit";
import {
  applyLoanSchema,
  recordApprovalSchema,
  disburseLoanSchema,
  type ApplyLoanInput,
  type RecordApprovalInput,
  type DisburseLoanInput,
} from "@/lib/validation/loans";
import { DEFAULT_LOAN_INTEREST_RATE, REQUIRED_LOAN_APPROVALS } from "@/lib/constants/loans";

/**
 * Loans + the dual-approval workflow (build spec §6.4, §7.3) — the app's headline
 * financial control. No single officer can ever advance a loan to `approved`: two
 * `approved` rows from two DISTINCT officers are required, guaranteed by the DB unique
 * constraint approvals_one_per_officer_per_target. Every approval/status change writes
 * an audit row inside the same transaction (CLAUDE.md §3).
 *
 * The officer-only column `decision_notes` is NEVER selected for a member-facing query.
 */

const PG_UNIQUE_VIOLATION = "23505";
function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === PG_UNIQUE_VIOLATION;
}

// ---------- Member-facing ----------

export type MyLoanRow = Pick<
  Selectable<Database["loans"]>,
  "id" | "amount" | "purpose" | "tenor_months" | "interest_rate" | "status" | "approval_count" | "outstanding_balance" | "disbursed_date" | "created_at"
>;

export async function listMyLoans(): Promise<MyLoanRow[]> {
  const user = await requireMember();
  return db
    .selectFrom("loans")
    .select([
      "id",
      "amount",
      "purpose",
      "tenor_months",
      "interest_rate",
      "status",
      "approval_count",
      "outstanding_balance",
      "disbursed_date",
      "created_at",
    ]) // decision_notes deliberately excluded (officer-only)
    .where("member_id", "=", user.id)
    .orderBy("created_at", "desc")
    .execute();
}

export type ApplyResult = { ok: true } | { ok: false; error: string };

export async function applyForLoan(input: ApplyLoanInput): Promise<ApplyResult> {
  const user = await requireMember();
  const parsed = applyLoanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await db.transaction().execute(async (tx) => {
    const loan = await tx
      .insertInto("loans")
      .values({
        member_id: user.id, // from session
        created_by: user.id,
        amount: parsed.data.amount,
        purpose: parsed.data.purpose,
        tenor_months: parsed.data.tenorMonths,
        interest_rate: DEFAULT_LOAN_INTEREST_RATE,
        status: "applied",
        outstanding_balance: 0,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await writeAudit(tx, {
      actorId: user.id,
      action: "loan.apply",
      entity: "loans",
      entityId: loan.id,
      details: { amount: parsed.data.amount, tenor_months: parsed.data.tenorMonths },
    });
  });

  revalidatePath("/loans");
  return { ok: true };
}

// ---------- Officer-facing ----------

export interface AdminLoanRow {
  id: string;
  member_id: string;
  member_name: string | null;
  fmf_member_id: string | null;
  amount: string;
  purpose: string;
  tenor_months: number | null;
  status: string;
  approval_count: number;
  outstanding_balance: string;
  decision_notes: string | null;
  created_at: Date;
}

export async function listAllLoans(): Promise<AdminLoanRow[]> {
  await requireOfficer();
  return db
    .selectFrom("loans")
    .innerJoin("users", "users.id", "loans.member_id")
    .leftJoin("member_profiles", "member_profiles.user_id", "loans.member_id")
    .select([
      "loans.id as id",
      "loans.member_id as member_id",
      "users.name as member_name",
      "member_profiles.fmf_member_id as fmf_member_id",
      "loans.amount as amount",
      "loans.purpose as purpose",
      "loans.tenor_months as tenor_months",
      "loans.status as status",
      "loans.approval_count as approval_count",
      "loans.outstanding_balance as outstanding_balance",
      "loans.decision_notes as decision_notes",
      "loans.created_at as created_at",
    ])
    .orderBy("loans.created_at", "desc")
    .execute();
}

export interface LoanApprovalRow {
  approver_id: string;
  approver_name: string | null;
  approver_role: string | null;
  decision: string;
  comment: string | null;
  created_at: Date;
}

export async function listLoanApprovals(loanId: string): Promise<LoanApprovalRow[]> {
  await requireOfficer();
  return db
    .selectFrom("approvals")
    .innerJoin("users", "users.id", "approvals.approver_id")
    .select([
      "approvals.approver_id as approver_id",
      "users.name as approver_name",
      "approvals.approver_role as approver_role",
      "approvals.decision as decision",
      "approvals.comment as comment",
      "approvals.created_at as created_at",
    ])
    .where("approvals.target_entity", "=", "loan")
    .where("approvals.target_id", "=", loanId)
    .orderBy("approvals.created_at", "asc")
    .execute();
}

export type ApprovalResult =
  | { ok: true; status: string; approvals: number }
  | { ok: false; error: string };

/**
 * Record one officer's decision on a loan. In a single transaction: insert the approval
 * (the unique constraint rejects a repeat by the same officer), recompute the count of
 * DISTINCT approving officers, and advance to `approved` only at the two-officer floor.
 */
export async function recordLoanApproval(input: RecordApprovalInput): Promise<ApprovalResult> {
  const officer = await requireOfficer("approveLoans"); // members can never reach this
  const parsed = recordApprovalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { loanId, decision, comment } = parsed.data;

  try {
    return await db.transaction().execute<ApprovalResult>(async (tx) => {
      const loan = await tx
        .selectFrom("loans")
        .select(["id", "status"])
        .where("id", "=", loanId)
        .executeTakeFirst();
      if (!loan) return { ok: false, error: "Loan not found." };
      if (["approved", "disbursed", "repaying", "closed", "rejected"].includes(loan.status)) {
        return { ok: false, error: `This loan is already ${loan.status}.` };
      }

      // One row per (loan, officer): a repeat by the same officer fails here (23505).
      await tx
        .insertInto("approvals")
        .values({
          target_entity: "loan",
          target_id: loanId,
          approver_id: officer.id,
          approver_role: officer.staffRole,
          decision,
          comment: comment || null,
        })
        .execute();

      if (decision === "rejected") {
        await tx.updateTable("loans").set({ status: "rejected" }).where("id", "=", loanId).execute();
        await writeAudit(tx, {
          actorId: officer.id,
          action: "loan.reject",
          entity: "loans",
          entityId: loanId,
          details: { comment: comment || null },
        });
        return { ok: true, status: "rejected", approvals: 0 };
      }

      // Count DISTINCT officers who have approved (not just rows).
      const countRow = await tx
        .selectFrom("approvals")
        .select((eb) => eb.fn.count<string>("approver_id").distinct().as("c"))
        .where("target_entity", "=", "loan")
        .where("target_id", "=", loanId)
        .where("decision", "=", "approved")
        .executeTakeFirst();
      const approvals = Number(countRow?.c ?? 0);

      const newStatus = approvals >= REQUIRED_LOAN_APPROVALS ? "approved" : "under_review";
      await tx
        .updateTable("loans")
        .set({ approval_count: approvals, status: newStatus })
        .where("id", "=", loanId)
        .execute();

      await writeAudit(tx, {
        actorId: officer.id,
        action: "loan.approve",
        entity: "loans",
        entityId: loanId,
        details: { distinct_approvals: approvals, resulting_status: newStatus },
      });

      return { ok: true, status: newStatus, approvals };
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return {
        ok: false,
        error: "You have already approved this loan; a different officer is required.",
      };
    }
    return { ok: false, error: "Could not record the approval." };
  }
}

export type DisburseResult = { ok: true } | { ok: false; error: string };

/** Disburse a loan — only after it has reached `approved` (two distinct officers). */
export async function disburseLoan(input: DisburseLoanInput): Promise<DisburseResult> {
  const officer = await requireOfficer("approveLoans");
  const parsed = disburseLoanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { loanId, outstandingBalance } = parsed.data;

  return db.transaction().execute<DisburseResult>(async (tx) => {
    const loan = await tx
      .selectFrom("loans")
      .select(["id", "status", "amount"])
      .where("id", "=", loanId)
      .executeTakeFirst();
    if (!loan) return { ok: false, error: "Loan not found." };
    if (loan.status !== "approved") {
      return { ok: false, error: "A loan must be approved by two officers before disbursement." };
    }

    const balance = outstandingBalance ?? Number(loan.amount);
    await tx
      .updateTable("loans")
      .set({ status: "disbursed", disbursed_date: new Date(), outstanding_balance: balance })
      .where("id", "=", loanId)
      .execute();

    await writeAudit(tx, {
      actorId: officer.id,
      action: "loan.disburse",
      entity: "loans",
      entityId: loanId,
      details: { outstanding_balance: balance },
    });

    revalidatePath("/admin/loans");
    return { ok: true };
  });
}

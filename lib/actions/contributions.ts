"use server";

import { revalidatePath } from "next/cache";
import type { Selectable } from "kysely";
import { requireMember } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import type { Database } from "@/lib/db/types";
import { recordContributionSchema, type RecordContributionInput } from "@/lib/validation/contributions";

/**
 * Member-owned contribution reads/writes. Ownership is ALWAYS the session user id —
 * there is no code path that accepts a member_id from the client (CLAUDE.md §3.1, §6).
 * Confirmation is officer-only and lives in the admin console (Phase 8); nothing here
 * can set status to 'confirmed'.
 */

export type MyContributionRow = Pick<
  Selectable<Database["contributions"]>,
  "id" | "type" | "amount" | "period" | "method" | "status" | "payment_reference" | "receipt_url" | "created_at"
>;

export async function listMyContributions(): Promise<MyContributionRow[]> {
  const user = await requireMember();
  return db
    .selectFrom("contributions")
    .select([
      "id",
      "type",
      "amount",
      "period",
      "method",
      "status",
      "payment_reference",
      "receipt_url",
      "created_at",
    ])
    .where("member_id", "=", user.id) // ownership from session — never the client
    .orderBy("created_at", "desc")
    .execute();
}

/**
 * Per-pool figures for the dashboard. Each pool is summed INDEPENDENTLY and returned
 * under its own key — there is deliberately no combined/total field, so no caller can
 * render a merged cross-pool balance (CLAUDE.md §3.5, build spec §6.2, §7.6).
 */
export interface DashboardSummary {
  confirmedSavings: number;
  confirmedWelfare: number;
  confirmedRegistration: number;
  loanOutstanding: number;
  investmentSubscriptions: number;
  pendingContributionCount: number;
  kycVerified: boolean;
}

async function sumContributions(
  memberId: string,
  type: "savings" | "welfare" | "registration",
  status: "confirmed",
): Promise<number> {
  const row = await db
    .selectFrom("contributions")
    .select((eb) => eb.fn.sum<string>("amount").as("total"))
    .where("member_id", "=", memberId)
    .where("type", "=", type)
    .where("status", "=", status)
    .executeTakeFirst();
  return Number(row?.total ?? 0);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const user = await requireMember();

  const [confirmedSavings, confirmedWelfare, confirmedRegistration] = await Promise.all([
    sumContributions(user.id, "savings", "confirmed"),
    sumContributions(user.id, "welfare", "confirmed"),
    sumContributions(user.id, "registration", "confirmed"),
  ]);

  const loanRow = await db
    .selectFrom("loans")
    .select((eb) => eb.fn.sum<string>("outstanding_balance").as("total"))
    .where("member_id", "=", user.id)
    .where("status", "in", ["approved", "disbursed", "repaying"])
    .executeTakeFirst();

  const subRow = await db
    .selectFrom("investment_subscriptions")
    .select((eb) => eb.fn.sum<string>("amount").as("total"))
    .where("member_id", "=", user.id)
    .where("status", "in", ["requested", "approved", "allocated"])
    .executeTakeFirst();

  const pendingRow = await db
    .selectFrom("contributions")
    .select((eb) => eb.fn.count<string>("id").as("count"))
    .where("member_id", "=", user.id)
    .where("status", "=", "pending")
    .executeTakeFirst();

  const profile = await db
    .selectFrom("member_profiles")
    .select(["kyc_status"])
    .where("user_id", "=", user.id)
    .executeTakeFirst();

  return {
    confirmedSavings,
    confirmedWelfare,
    confirmedRegistration,
    loanOutstanding: Number(loanRow?.total ?? 0),
    investmentSubscriptions: Number(subRow?.total ?? 0),
    pendingContributionCount: Number(pendingRow?.count ?? 0),
    kycVerified: profile?.kyc_status === "verified",
  };
}

export type RecordResult = { ok: true } | { ok: false; error: string };

/** Record a new contribution as PENDING. Members never confirm their own payments. */
export async function recordContribution(input: RecordContributionInput): Promise<RecordResult> {
  const user = await requireMember();
  const parsed = recordContributionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { type, amount, period, method, paymentReference, receiptUrl } = parsed.data;

  await db
    .insertInto("contributions")
    .values({
      member_id: user.id, // from session
      created_by: user.id,
      type,
      amount,
      period: period || new Date().toISOString().slice(0, 7),
      method,
      payment_reference: paymentReference || null,
      receipt_url: receiptUrl || null,
      status: "pending", // officer confirms later; never here
    })
    .execute();

  revalidatePath("/contributions");
  revalidatePath("/dashboard");
  return { ok: true };
}

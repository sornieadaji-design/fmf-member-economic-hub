"use server";

import { requireOfficer } from "@/lib/auth/guards";
import { db } from "@/lib/db";

/**
 * Reports (build spec §6.8, §7.6). Every pool is summed INDEPENDENTLY — savings, welfare,
 * investment, registration and levy are never merged into one figure, and the loan book
 * and subscriptions are reported on their own.
 */

async function sumConfirmedByType(type: "savings" | "welfare" | "investment" | "registration" | "admin_levy"): Promise<number> {
  const row = await db
    .selectFrom("contributions")
    .select((eb) => eb.fn.sum<string>("amount").as("t"))
    .where("type", "=", type)
    .where("status", "=", "confirmed")
    .executeTakeFirst();
  return Number(row?.t ?? 0);
}

export interface ReportTotals {
  members: { total: number; active: number };
  contributionsByPool: { savings: number; welfare: number; investment: number; registration: number; admin_levy: number };
  loanBook: { outstanding: number; disbursedCount: number; approvedCount: number };
  subscriptions: { allocated: number };
  welfarePaid: number;
}

export async function getReportTotals(): Promise<ReportTotals> {
  await requireOfficer();

  const [savings, welfare, investment, registration, admin_levy] = await Promise.all([
    sumConfirmedByType("savings"),
    sumConfirmedByType("welfare"),
    sumConfirmedByType("investment"),
    sumConfirmedByType("registration"),
    sumConfirmedByType("admin_levy"),
  ]);

  const memberTotal = await db.selectFrom("member_profiles").select((eb) => eb.fn.count<string>("user_id").as("n")).executeTakeFirst();
  const memberActive = await db
    .selectFrom("member_profiles")
    .select((eb) => eb.fn.count<string>("user_id").as("n"))
    .where("onboarding_status", "=", "active")
    .executeTakeFirst();

  const outstanding = await db
    .selectFrom("loans")
    .select((eb) => eb.fn.sum<string>("outstanding_balance").as("t"))
    .where("status", "in", ["disbursed", "repaying"])
    .executeTakeFirst();
  const disbursed = await db.selectFrom("loans").select((eb) => eb.fn.count<string>("id").as("n")).where("status", "in", ["disbursed", "repaying", "closed"]).executeTakeFirst();
  const approved = await db.selectFrom("loans").select((eb) => eb.fn.count<string>("id").as("n")).where("status", "=", "approved").executeTakeFirst();

  const alloc = await db
    .selectFrom("investment_subscriptions")
    .select((eb) => eb.fn.sum<string>("amount").as("t"))
    .where("status", "=", "allocated")
    .executeTakeFirst();

  const welfarePaidRow = await db
    .selectFrom("welfare_claims")
    .select((eb) => eb.fn.sum<string>("amount_requested").as("t"))
    .where("status", "=", "paid")
    .executeTakeFirst();

  return {
    members: { total: Number(memberTotal?.n ?? 0), active: Number(memberActive?.n ?? 0) },
    contributionsByPool: { savings, welfare, investment, registration, admin_levy },
    loanBook: { outstanding: Number(outstanding?.t ?? 0), disbursedCount: Number(disbursed?.n ?? 0), approvedCount: Number(approved?.n ?? 0) },
    subscriptions: { allocated: Number(alloc?.t ?? 0) },
    welfarePaid: Number(welfarePaidRow?.t ?? 0),
  };
}

export interface ApprovalQueue {
  loans: number;
  welfare: number;
  subscriptions: number;
}

/** Counts of items awaiting officer approval, for the Approvals queue tab. */
export async function getApprovalQueue(): Promise<ApprovalQueue> {
  await requireOfficer();
  const loans = await db.selectFrom("loans").select((eb) => eb.fn.count<string>("id").as("n")).where("status", "in", ["applied", "under_review"]).executeTakeFirst();
  const welfare = await db.selectFrom("welfare_claims").select((eb) => eb.fn.count<string>("id").as("n")).where("status", "in", ["submitted", "under_review"]).executeTakeFirst();
  const subs = await db.selectFrom("investment_subscriptions").select((eb) => eb.fn.count<string>("id").as("n")).where("status", "in", ["requested", "approved"]).executeTakeFirst();
  return { loans: Number(loans?.n ?? 0), welfare: Number(welfare?.n ?? 0), subscriptions: Number(subs?.n ?? 0) };
}

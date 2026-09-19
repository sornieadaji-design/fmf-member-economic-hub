import { Kysely, sql } from "kysely";

/**
 * pgcrypto (for gen_random_uuid) + every Postgres enum type used by the schema.
 * Enum values mirror lib/validation/enums.ts — keep the two in sync.
 */

const ENUMS: Record<string, string[]> = {
  participation_option: ["cooperative", "investment", "both", "information_only"],
  membership_category: ["founding", "active", "associate", "honorary"],
  tier: ["basic", "standard", "growth", "investor", "none"],
  payment_frequency: ["monthly", "quarterly", "annually"],
  staff_role: [
    "member", "president", "vice_president", "secretary", "treasurer",
    "financial_secretary", "welfare_officer", "loan_officer",
    "investment_committee", "trustee", "auditor", "administrator",
  ],
  user_role: ["admin", "member"],
  kyc_status: ["not_started", "submitted", "verified", "rejected"],
  onboarding_status: [
    "registered", "profile_complete", "kyc_complete", "consented",
    "tier_selected", "active",
  ],
  member_status: ["active", "inactive", "suspended"],
  contribution_type: ["savings", "welfare", "investment", "registration", "admin_levy"],
  contribution_method: ["bank_transfer", "card", "cash", "other"],
  contribution_status: ["pending", "confirmed", "rejected"],
  loan_status: [
    "applied", "under_review", "approved", "disbursed", "repaying", "closed", "rejected",
  ],
  loan_repayment_method: ["bank_transfer", "card", "cash", "salary_deduction", "other"],
  loan_repayment_status: ["pending", "confirmed"],
  asset_class: [
    "fixed_income", "money_market", "equities", "real_estate",
    "private_business", "agriculture", "other",
  ],
  risk_level: ["low", "low_moderate", "moderate", "moderate_high", "high"],
  opportunity_status: ["draft", "open", "closed", "cancelled"],
  subscription_status: ["requested", "approved", "allocated", "rejected", "exited"],
  welfare_category: ["bereavement", "medical", "emergency", "education", "other"],
  welfare_status: ["submitted", "under_review", "approved", "paid", "rejected"],
  announcement_category: ["notice", "newsletter", "policy", "meeting", "report"],
  announcement_audience: ["all", "cooperative", "investment", "officers"],
  resolution_status: ["draft", "open", "closed"],
  approval_target: ["loan", "investment_subscription", "welfare_claim", "contribution"],
  approval_decision: ["approved", "rejected"],
};

export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`.execute(db);
  for (const [name, values] of Object.entries(ENUMS)) {
    await db.schema.createType(name).asEnum(values).execute();
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  for (const name of Object.keys(ENUMS).reverse()) {
    await db.schema.dropType(name).ifExists().execute();
  }
}

import { z } from "zod";

/**
 * Single source of truth for enum values, shared client + server.
 * These MUST stay in sync with the Postgres enum types created in migrations/001.
 * (Postgres enforces them in the DB; Zod enforces them at the boundary.)
 */

export const participationOption = z.enum([
  "cooperative",
  "investment",
  "both",
  "information_only",
]);

export const membershipCategory = z.enum([
  "founding",
  "active",
  "associate",
  "honorary",
]);

export const tier = z.enum(["basic", "standard", "growth", "investor", "none"]);

export const paymentFrequency = z.enum(["monthly", "quarterly", "annually"]);

export const staffRole = z.enum([
  "member",
  "president",
  "vice_president",
  "secretary",
  "treasurer",
  "financial_secretary",
  "welfare_officer",
  "loan_officer",
  "investment_committee",
  "trustee",
  "auditor",
  "administrator",
]);

export const userRole = z.enum(["admin", "member"]);

export const kycStatus = z.enum([
  "not_started",
  "submitted",
  "verified",
  "rejected",
]);

export const onboardingStatus = z.enum([
  "registered",
  "profile_complete",
  "kyc_complete",
  "consented",
  "tier_selected",
  "active",
]);

export const memberStatus = z.enum(["active", "inactive", "suspended"]);

export const contributionType = z.enum([
  "savings",
  "welfare",
  "investment",
  "registration",
  "admin_levy",
]);

export const contributionMethod = z.enum([
  "bank_transfer",
  "card",
  "cash",
  "other",
]);

export const contributionStatus = z.enum(["pending", "confirmed", "rejected"]);

export const loanStatus = z.enum([
  "applied",
  "under_review",
  "approved",
  "disbursed",
  "repaying",
  "closed",
  "rejected",
]);

export const loanRepaymentMethod = z.enum([
  "bank_transfer",
  "card",
  "cash",
  "salary_deduction",
  "other",
]);

export const loanRepaymentStatus = z.enum(["pending", "confirmed"]);

export const assetClass = z.enum([
  "fixed_income",
  "money_market",
  "equities",
  "real_estate",
  "private_business",
  "agriculture",
  "other",
]);

export const riskLevel = z.enum([
  "low",
  "low_moderate",
  "moderate",
  "moderate_high",
  "high",
]);

export const opportunityStatus = z.enum([
  "draft",
  "open",
  "closed",
  "cancelled",
]);

export const subscriptionStatus = z.enum([
  "requested",
  "approved",
  "allocated",
  "rejected",
  "exited",
]);

export const welfareCategory = z.enum([
  "bereavement",
  "medical",
  "emergency",
  "education",
  "other",
]);

export const welfareStatus = z.enum([
  "submitted",
  "under_review",
  "approved",
  "paid",
  "rejected",
]);

export const announcementCategory = z.enum([
  "notice",
  "newsletter",
  "policy",
  "meeting",
  "report",
]);

export const announcementAudience = z.enum([
  "all",
  "cooperative",
  "investment",
  "officers",
]);

export const resolutionStatus = z.enum(["draft", "open", "closed"]);

export const approvalTarget = z.enum([
  "loan",
  "investment_subscription",
  "welfare_claim",
  "contribution",
]);

export const approvalDecision = z.enum(["approved", "rejected"]);

/** Every Postgres enum type name, for the migration to create in one place. */
export const PG_ENUMS = {
  participation_option: participationOption.options,
  membership_category: membershipCategory.options,
  tier: tier.options,
  payment_frequency: paymentFrequency.options,
  staff_role: staffRole.options,
  user_role: userRole.options,
  kyc_status: kycStatus.options,
  onboarding_status: onboardingStatus.options,
  member_status: memberStatus.options,
  contribution_type: contributionType.options,
  contribution_method: contributionMethod.options,
  contribution_status: contributionStatus.options,
  loan_status: loanStatus.options,
  loan_repayment_method: loanRepaymentMethod.options,
  loan_repayment_status: loanRepaymentStatus.options,
  asset_class: assetClass.options,
  risk_level: riskLevel.options,
  opportunity_status: opportunityStatus.options,
  subscription_status: subscriptionStatus.options,
  welfare_category: welfareCategory.options,
  welfare_status: welfareStatus.options,
  announcement_category: announcementCategory.options,
  announcement_audience: announcementAudience.options,
  resolution_status: resolutionStatus.options,
  approval_target: approvalTarget.options,
  approval_decision: approvalDecision.options,
} as const;

import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

/**
 * Kysely database types. Kept in sync by hand with the migrations.
 * (You may later switch to `kysely-codegen` to generate these from the live DB.)
 *
 * Enum columns use string-literal unions matching lib/validation/enums.ts.
 * `Timestamp` = a column Postgres stores as timestamptz; read as Date, written as Date|string.
 */

type Timestamp = ColumnType<Date, Date | string, Date | string>;
// A defaulted timestamptz column: selects as Date, optional on insert. (Use this rather
// than Generated<Timestamp>, which double-wraps ColumnType and fails to unwrap to Date.)
type GeneratedTimestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type Numeric = ColumnType<string, number | string, number | string>; // pg returns numeric as string
// A numeric column with a DB default (e.g. `default 0`): optional on insert.
type NumericDefault = ColumnType<string, number | string | undefined, number | string>;

// --- Enum unions (mirror lib/validation/enums.ts) ---
type ParticipationOption = "cooperative" | "investment" | "both" | "information_only";
type MembershipCategory = "founding" | "active" | "associate" | "honorary";
type Tier = "basic" | "standard" | "growth" | "investor" | "none";
type PaymentFrequency = "monthly" | "quarterly" | "annually";
type StaffRole =
  | "member" | "president" | "vice_president" | "secretary" | "treasurer"
  | "financial_secretary" | "welfare_officer" | "loan_officer"
  | "investment_committee" | "trustee" | "auditor" | "administrator";
type UserRole = "admin" | "member";
type KycStatus = "not_started" | "submitted" | "verified" | "rejected";
type OnboardingStatus =
  | "registered" | "profile_complete" | "kyc_complete" | "consented"
  | "tier_selected" | "active";
type MemberStatus = "active" | "inactive" | "suspended";
type ContributionType = "savings" | "welfare" | "investment" | "registration" | "admin_levy";
type ContributionMethod = "bank_transfer" | "card" | "cash" | "other";
type ContributionStatus = "pending" | "confirmed" | "rejected";
type LoanStatus =
  | "applied" | "under_review" | "approved" | "disbursed" | "repaying" | "closed" | "rejected";
type LoanRepaymentMethod = "bank_transfer" | "card" | "cash" | "salary_deduction" | "other";
type LoanRepaymentStatus = "pending" | "confirmed";
type AssetClass =
  | "fixed_income" | "money_market" | "equities" | "real_estate"
  | "private_business" | "agriculture" | "other";
type RiskLevel = "low" | "low_moderate" | "moderate" | "moderate_high" | "high";
type OpportunityStatus = "draft" | "open" | "closed" | "cancelled";
type SubscriptionStatus = "requested" | "approved" | "allocated" | "rejected" | "exited";
type WelfareCategory = "bereavement" | "medical" | "emergency" | "education" | "other";
type WelfareStatus = "submitted" | "under_review" | "approved" | "paid" | "rejected";
type AnnouncementCategory = "notice" | "newsletter" | "policy" | "meeting" | "report";
type AnnouncementAudience = "all" | "cooperative" | "investment" | "officers";
type ResolutionStatus = "draft" | "open" | "closed";
type ApprovalTarget = "loan" | "investment_subscription" | "welfare_claim" | "contribution";
type ApprovalDecision = "approved" | "rejected";

// --- Auth.js (managed by @auth/pg-adapter). Do not redefine columns the adapter owns. ---
interface UsersTable {
  id: Generated<string>;
  name: string | null;
  email: string;
  emailVerified: Timestamp | null;
  image: string | null;
}
interface AccountsTable {
  id: Generated<string>;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
}
interface SessionsTable {
  id: Generated<string>;
  userId: string;
  sessionToken: string;
  expires: Timestamp;
}
interface VerificationTokenTable {
  identifier: string;
  token: string;
  expires: Timestamp;
}

// --- FMF domain tables ---
interface MemberProfilesTable {
  user_id: string;
  fmf_member_id: string | null;
  phone: string | null;
  participation_option: ColumnType<ParticipationOption, ParticipationOption | undefined, ParticipationOption>;
  membership_category: ColumnType<MembershipCategory, MembershipCategory | undefined, MembershipCategory>;
  tier: ColumnType<Tier, Tier | undefined, Tier>;
  monthly_contribution: NumericDefault;
  payment_frequency: ColumnType<PaymentFrequency, PaymentFrequency | undefined, PaymentFrequency>;
  staff_role: ColumnType<StaffRole, StaffRole | undefined, StaffRole>;
  role: ColumnType<UserRole, UserRole | undefined, UserRole>;
  kyc_status: ColumnType<KycStatus, KycStatus | undefined, KycStatus>;
  kyc_document_url: string | null;
  onboarding_status: ColumnType<OnboardingStatus, OnboardingStatus | undefined, OnboardingStatus>;
  consent_accepted: ColumnType<boolean, boolean | undefined, boolean>;
  consent_date: Timestamp | null;
  status: ColumnType<MemberStatus, MemberStatus | undefined, MemberStatus>;
  created_at: GeneratedTimestamp;
}

interface ContributionsTable {
  id: Generated<string>;
  member_id: string;
  type: ContributionType;
  amount: Numeric;
  currency: ColumnType<string, string | undefined, string>;
  period: string | null;
  method: ColumnType<ContributionMethod, ContributionMethod | undefined, ContributionMethod>;
  payment_reference: string | null;
  receipt_url: string | null;
  status: ColumnType<ContributionStatus, ContributionStatus | undefined, ContributionStatus>;
  confirmed_by: string | null;
  confirmed_date: Timestamp | null;
  notes: string | null;
  created_at: GeneratedTimestamp;
  created_by: string | null;
}

interface LoansTable {
  id: Generated<string>;
  member_id: string;
  amount: Numeric;
  purpose: string;
  tenor_months: number | null;
  interest_rate: Numeric | null;
  status: ColumnType<LoanStatus, LoanStatus | undefined, LoanStatus>;
  approval_count: ColumnType<number, number | undefined, number>;
  disbursed_date: ColumnType<Date, Date | string, Date | string> | null;
  outstanding_balance: NumericDefault;
  decision_notes: string | null; // OFFICER-ONLY: never select for a member client
  created_at: GeneratedTimestamp;
  created_by: string | null;
}

interface LoanRepaymentsTable {
  id: Generated<string>;
  loan_id: string;
  member_id: string;
  amount: Numeric;
  paid_date: ColumnType<Date, Date | string, Date | string> | null;
  method: LoanRepaymentMethod | null;
  status: ColumnType<LoanRepaymentStatus, LoanRepaymentStatus | undefined, LoanRepaymentStatus>;
  created_at: GeneratedTimestamp;
}

interface InvestmentOpportunitiesTable {
  id: Generated<string>;
  title: string;
  description: string | null;
  asset_class: AssetClass;
  risk_level: RiskLevel;
  min_subscription: Numeric | null;
  target_amount: Numeric | null;
  raised_amount: NumericDefault;
  disclosure_url: string | null;
  status: ColumnType<OpportunityStatus, OpportunityStatus | undefined, OpportunityStatus>;
  opens_on: ColumnType<Date, Date | string, Date | string> | null;
  closes_on: ColumnType<Date, Date | string, Date | string> | null;
  created_at: GeneratedTimestamp;
  created_by: string | null;
}

interface InvestmentSubscriptionsTable {
  id: Generated<string>;
  opportunity_id: string;
  member_id: string;
  amount: Numeric;
  units: NumericDefault;
  status: ColumnType<SubscriptionStatus, SubscriptionStatus | undefined, SubscriptionStatus>;
  risk_acknowledged: ColumnType<boolean, boolean | undefined, boolean>;
  created_at: GeneratedTimestamp;
  created_by: string | null;
}

interface WelfareClaimsTable {
  id: Generated<string>;
  member_id: string;
  category: WelfareCategory;
  amount_requested: Numeric;
  reason: string | null;
  evidence_url: string | null;
  status: ColumnType<WelfareStatus, WelfareStatus | undefined, WelfareStatus>;
  created_at: GeneratedTimestamp;
  created_by: string | null;
}

interface AnnouncementsTable {
  id: Generated<string>;
  title: string;
  body: string | null;
  category: ColumnType<AnnouncementCategory, AnnouncementCategory | undefined, AnnouncementCategory>;
  file_url: string | null;
  is_policy: ColumnType<boolean, boolean | undefined, boolean>;
  audience: ColumnType<AnnouncementAudience, AnnouncementAudience | undefined, AnnouncementAudience>;
  created_at: GeneratedTimestamp;
  created_by: string | null;
}

interface ResolutionsTable {
  id: Generated<string>;
  title: string;
  description: string | null;
  options: ColumnType<string[], string[] | undefined, string[]>;
  status: ColumnType<ResolutionStatus, ResolutionStatus | undefined, ResolutionStatus>;
  opens_on: ColumnType<Date, Date | string, Date | string> | null;
  closes_on: ColumnType<Date, Date | string, Date | string> | null;
  created_at: GeneratedTimestamp;
  created_by: string | null;
}

interface VotesTable {
  id: Generated<string>;
  resolution_id: string;
  member_id: string;
  choice: string;
  created_at: GeneratedTimestamp;
}

interface ApprovalsTable {
  id: Generated<string>;
  target_entity: ApprovalTarget;
  target_id: string;
  approver_id: string;
  approver_role: string | null;
  decision: ApprovalDecision;
  comment: string | null;
  created_at: GeneratedTimestamp;
}

interface AuditLogsTable {
  id: Generated<string>;
  actor_id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: ColumnType<unknown, unknown, never>; // jsonb; append-only (no update)
  created_at: GeneratedTimestamp;
}

interface SettingsTable {
  key: string;
  value: string;
  description: string | null;
  updated_at: GeneratedTimestamp;
}

export interface Database {
  // Auth.js tables (adapter-managed)
  users: UsersTable;
  accounts: AccountsTable;
  sessions: SessionsTable;
  verification_token: VerificationTokenTable;
  // FMF domain
  member_profiles: MemberProfilesTable;
  contributions: ContributionsTable;
  loans: LoansTable;
  loan_repayments: LoanRepaymentsTable;
  investment_opportunities: InvestmentOpportunitiesTable;
  investment_subscriptions: InvestmentSubscriptionsTable;
  welfare_claims: WelfareClaimsTable;
  announcements: AnnouncementsTable;
  resolutions: ResolutionsTable;
  votes: VotesTable;
  approvals: ApprovalsTable;
  audit_logs: AuditLogsTable;
  settings: SettingsTable;
}

// Convenience row types
export type MemberProfile = Selectable<MemberProfilesTable>;
export type NewMemberProfile = Insertable<MemberProfilesTable>;
export type MemberProfileUpdate = Updateable<MemberProfilesTable>;
export type Contribution = Selectable<ContributionsTable>;
export type Loan = Selectable<LoansTable>;
export type Approval = Selectable<ApprovalsTable>;
export type AuditLog = Selectable<AuditLogsTable>;

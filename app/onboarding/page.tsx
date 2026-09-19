import { redirect } from "next/navigation";
import { requireSignedIn } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { OnboardingWizard, type WizardInitialData } from "@/components/onboarding/OnboardingWizard";
import { Logo } from "@/components/brand/Logo";
import type {
  ParticipationOption,
  MembershipCategory,
  Tier,
  PaymentFrequency,
} from "@/lib/validation/onboarding";

/**
 * The 11-step onboarding wizard (build spec §6.1). Any signed-in member whose
 * onboarding_status is not yet 'active' lands here; an already-active member is sent to
 * the dashboard. The wizard resumes from the persisted status.
 */
export default async function OnboardingPage() {
  const user = await requireSignedIn();

  // Load the member's current onboarding state (creating a profile row if missing).
  await db
    .insertInto("member_profiles")
    .values({ user_id: user.id })
    .onConflict((oc) => oc.column("user_id").doNothing())
    .execute();

  const row = await db
    .selectFrom("member_profiles")
    .innerJoin("users", "users.id", "member_profiles.user_id")
    .select([
      "users.name as name",
      "member_profiles.phone as phone",
      "member_profiles.participation_option as participation_option",
      "member_profiles.membership_category as membership_category",
      "member_profiles.tier as tier",
      "member_profiles.payment_frequency as payment_frequency",
      "member_profiles.monthly_contribution as monthly_contribution",
      "member_profiles.kyc_status as kyc_status",
      "member_profiles.kyc_document_url as kyc_document_url",
      "member_profiles.consent_accepted as consent_accepted",
      "member_profiles.onboarding_status as onboarding_status",
      "member_profiles.fmf_member_id as fmf_member_id",
    ])
    .where("member_profiles.user_id", "=", user.id)
    .executeTakeFirstOrThrow();

  if (row.onboarding_status === "active") {
    redirect("/dashboard");
  }

  const hasInitialContribution = Boolean(
    await db
      .selectFrom("contributions")
      .select("id")
      .where("member_id", "=", user.id)
      .where("type", "=", "registration")
      .executeTakeFirst(),
  );

  const initial: WizardInitialData = {
    fullName: row.name ?? "",
    phone: row.phone ?? "",
    participationOption: row.participation_option as ParticipationOption,
    membershipCategory: row.membership_category as MembershipCategory,
    tier: row.tier as Tier,
    paymentFrequency: row.payment_frequency as PaymentFrequency,
    monthlyContribution: Number(row.monthly_contribution ?? 0),
    kycStatus: row.kyc_status,
    kycDocumentUrl: row.kyc_document_url,
    consentAccepted: row.consent_accepted,
    onboardingStatus: row.onboarding_status,
    fmfMemberId: row.fmf_member_id,
    hasInitialContribution,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="brand-bar h-2 w-full" />
      <main className="container flex flex-1 flex-col justify-center gap-6 py-8">
        <div className="flex flex-col items-center gap-2">
          <Logo className="h-14 w-auto" priority />
        </div>
        <OnboardingWizard initial={initial} />
      </main>
    </div>
  );
}

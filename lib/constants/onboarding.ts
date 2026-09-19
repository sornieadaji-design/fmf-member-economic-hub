import type { Tier, PaymentFrequency } from "@/lib/validation/onboarding";

/**
 * Onboarding configuration.
 *
 * ⚠️ ILLUSTRATIVE FIGURES. Every tier amount here is a placeholder to be set by the
 * General Assembly after the affordability survey and a reviewed financial model
 * (build spec §14). They are indicative NGN monthly contributions, not obligations.
 */
export interface TierOption {
  value: Exclude<Tier, "none">;
  label: string;
  /** Indicative monthly contribution in NGN (whole Naira). */
  monthlyContribution: number;
  blurb: string;
}

export const TIERS: TierOption[] = [
  { value: "basic", label: "Basic", monthlyContribution: 10000, blurb: "A steady start to building savings." },
  { value: "standard", label: "Standard", monthlyContribution: 25000, blurb: "The common choice for active members." },
  { value: "growth", label: "Growth", monthlyContribution: 50000, blurb: "For members saving toward larger goals." },
  { value: "investor", label: "Investor", monthlyContribution: 100000, blurb: "₦100,000+ — for members ready to commit more." },
];

export const PAYMENT_FREQUENCIES: { value: PaymentFrequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

/**
 * FMF collection account shown at the initial-contribution step. No funds move in-app;
 * members transfer manually and record the reference (build spec §8).
 *
 * ⚠️ PLACEHOLDER — replace with the Society's real, confirmed bank details before launch.
 */
export const FMF_BANK_DETAILS = {
  bankName: "«Bank name — configure before launch»",
  accountName: "FMF Coop & Investment Club",
  accountNumber: "«0000000000»",
} as const;

/** The wizard's ordered steps (build spec §6.1). */
export const ONBOARDING_STEPS = [
  "welcome",
  "register",
  "profile",
  "participation",
  "kyc",
  "consent",
  "tier",
  "contribution",
  "member_id",
  "orientation",
  "finish",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

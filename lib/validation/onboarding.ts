import { z } from "zod";
import {
  participationOption,
  membershipCategory,
  tier as tierEnum,
  paymentFrequency,
} from "@/lib/validation/enums";
import { fileRef } from "@/lib/validation/file";

/**
 * Zod schemas for each onboarding step (build spec §6.1). Shared client + server:
 * the wizard forms validate with these, and every server action re-validates the
 * same schema before touching the database (CLAUDE.md §6).
 */

export type ParticipationOption = z.infer<typeof participationOption>;
export type MembershipCategory = z.infer<typeof membershipCategory>;
export type Tier = z.infer<typeof tierEnum>;
export type PaymentFrequency = z.infer<typeof paymentFrequency>;

// Step 2 — Register
export const registrationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number.")
    .max(20)
    .regex(/^[0-9+()\-\s]+$/, "Phone can contain digits and + ( ) - only."),
});
export type RegistrationInput = z.infer<typeof registrationSchema>;

// Step 3 — Profile
export const profileSchema = z.object({
  membershipCategory: membershipCategory,
});
export type ProfileInput = z.infer<typeof profileSchema>;

// Step 4 — Participation
export const participationSchema = z.object({
  participationOption: participationOption,
});
export type ParticipationInput = z.infer<typeof participationSchema>;

// Step 5 — KYC (the document is uploaded to Blob first; the action receives the file ref)
export const kycSchema = z.object({
  documentUrl: fileRef,
});
export type KycInput = z.infer<typeof kycSchema>;

// Step 6 — Consent
export const consentSchema = z.object({
  accept: z.literal(true, {
    errorMap: () => ({ message: "You must accept the rules to continue." }),
  }),
});
export type ConsentInput = z.infer<typeof consentSchema>;

// Step 7 — Tier (skipped for information_only participation)
export const tierSchema = z.object({
  tier: tierEnum.exclude(["none"]),
  paymentFrequency: paymentFrequency,
});
export type TierInput = z.infer<typeof tierSchema>;

// Step 8 — Initial contribution (reference + optional receipt; no funds move in-app)
export const initialContributionSchema = z.object({
  paymentReference: z.string().trim().min(3, "Enter your transfer reference.").max(120),
  receiptUrl: fileRef.optional().or(z.literal("")),
});
export type InitialContributionInput = z.infer<typeof initialContributionSchema>;

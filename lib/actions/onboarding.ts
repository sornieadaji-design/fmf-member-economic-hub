"use server";

import { revalidatePath } from "next/cache";
import { sql } from "kysely";
import { requireSignedIn } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { formatMemberId } from "@/lib/utils/format";
import { TIERS } from "@/lib/constants/onboarding";
import {
  registrationSchema,
  profileSchema,
  participationSchema,
  kycSchema,
  consentSchema,
  tierSchema,
  initialContributionSchema,
  type RegistrationInput,
  type ProfileInput,
  type ParticipationInput,
  type KycInput,
  type TierInput,
  type InitialContributionInput,
} from "@/lib/validation/onboarding";

/**
 * Onboarding server actions (build spec §6.1, §7.1). Every action:
 *   1. authorises with a guard (the member id is the SESSION user — never the client);
 *   2. re-validates its input with the same Zod schema the form uses;
 *   3. advances onboarding_status so the wizard is resumable and the gate holds.
 *
 * A member cannot act on anyone else's profile: all writes are `where user_id = session.id`.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Ensure a member_profiles row exists for the signed-in user. Normally created by the
 * `createUser` Auth.js event on first sign-in (lib/auth/index.ts); this is a safety net
 * so the wizard is robust even if that event did not fire.
 */
async function ensureProfile(userId: string): Promise<void> {
  await db
    .insertInto("member_profiles")
    .values({ user_id: userId })
    .onConflict((oc) => oc.column("user_id").doNothing())
    .execute();
}

// Step 2 — Register: name lives on the auth user; phone on the profile.
export async function saveRegistration(input: RegistrationInput): Promise<ActionResult> {
  const user = await requireSignedIn();
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await ensureProfile(user.id);
  await db.updateTable("users").set({ name: parsed.data.fullName }).where("id", "=", user.id).execute();
  await db
    .updateTable("member_profiles")
    .set({ phone: parsed.data.phone })
    .where("user_id", "=", user.id)
    .execute();

  revalidatePath("/onboarding");
  return { ok: true };
}

// Step 3 — Profile
export async function saveProfile(input: ProfileInput): Promise<ActionResult> {
  const user = await requireSignedIn();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await ensureProfile(user.id);
  await db
    .updateTable("member_profiles")
    .set({ membership_category: parsed.data.membershipCategory })
    .where("user_id", "=", user.id)
    .execute();

  revalidatePath("/onboarding");
  return { ok: true };
}

// Step 4 — Participation → advances to profile_complete
export async function saveParticipation(input: ParticipationInput): Promise<ActionResult> {
  const user = await requireSignedIn();
  const parsed = participationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await ensureProfile(user.id);
  await db
    .updateTable("member_profiles")
    .set({
      participation_option: parsed.data.participationOption,
      onboarding_status: "profile_complete",
    })
    .where("user_id", "=", user.id)
    .execute();

  revalidatePath("/onboarding");
  return { ok: true };
}

// Step 5 — KYC → advances to kyc_complete
export async function submitKyc(input: KycInput): Promise<ActionResult> {
  const user = await requireSignedIn();
  const parsed = kycSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await ensureProfile(user.id);
  await db
    .updateTable("member_profiles")
    .set({
      kyc_document_url: parsed.data.documentUrl,
      kyc_status: "submitted",
      onboarding_status: "kyc_complete",
    })
    .where("user_id", "=", user.id)
    .execute();

  revalidatePath("/onboarding");
  return { ok: true };
}

// Step 6 — Consent → advances to consented
export async function acceptConsent(input: { accept: boolean }): Promise<ActionResult> {
  const user = await requireSignedIn();
  const parsed = consentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await ensureProfile(user.id);
  await db
    .updateTable("member_profiles")
    .set({
      consent_accepted: true,
      consent_date: new Date(),
      onboarding_status: "consented",
    })
    .where("user_id", "=", user.id)
    .execute();

  revalidatePath("/onboarding");
  return { ok: true };
}

// Step 7 — Tier → advances to tier_selected
export async function selectTier(input: TierInput): Promise<ActionResult> {
  const user = await requireSignedIn();
  const parsed = tierSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const tierOption = TIERS.find((t) => t.value === parsed.data.tier);
  if (!tierOption) return { ok: false, error: "Unknown tier." };

  await ensureProfile(user.id);
  await db
    .updateTable("member_profiles")
    .set({
      tier: parsed.data.tier,
      monthly_contribution: tierOption.monthlyContribution,
      payment_frequency: parsed.data.paymentFrequency,
      onboarding_status: "tier_selected",
    })
    .where("user_id", "=", user.id)
    .execute();

  revalidatePath("/onboarding");
  return { ok: true };
}

/** Information-only members skip the tier step but still advance the gate. */
export async function skipTier(): Promise<ActionResult> {
  const user = await requireSignedIn();
  await ensureProfile(user.id);
  await db
    .updateTable("member_profiles")
    .set({ tier: "none", monthly_contribution: 0, onboarding_status: "tier_selected" })
    .where("user_id", "=", user.id)
    .execute();

  revalidatePath("/onboarding");
  return { ok: true };
}

// Step 8 — Initial contribution: recorded pending; NO funds move in-app (build spec §6.1).
export async function recordInitialContribution(
  input: InitialContributionInput,
): Promise<ActionResult> {
  const user = await requireSignedIn();
  const parsed = initialContributionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const profile = await db
    .selectFrom("member_profiles")
    .select(["monthly_contribution"])
    .where("user_id", "=", user.id)
    .executeTakeFirst();

  const amount = Number(profile?.monthly_contribution ?? 0);
  if (amount <= 0) {
    return { ok: false, error: "Select a contribution tier before recording a payment." };
  }

  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  await db
    .insertInto("contributions")
    .values({
      member_id: user.id,
      created_by: user.id,
      type: "registration",
      amount,
      period,
      method: "bank_transfer",
      payment_reference: parsed.data.paymentReference,
      receipt_url: parsed.data.receiptUrl || null,
      status: "pending",
    })
    .execute();

  revalidatePath("/onboarding");
  return { ok: true };
}

/**
 * Step 11 — Finish. In one transaction: assign the FMF Member ID (if not already set,
 * from the concurrency-safe sequence), flip onboarding_status to 'active', and write an
 * audit row for the activation. Idempotent: re-running keeps the existing member id.
 */
export async function finishOnboarding(): Promise<
  { ok: true; fmfMemberId: string } | { ok: false; error: string }
> {
  const user = await requireSignedIn();
  await ensureProfile(user.id);

  try {
    // Idempotent: keep an already-issued id. Otherwise allocate the next free one,
    // skipping any FMF-#### already taken (e.g. by seeded demo members).
    const existing = await db
      .selectFrom("member_profiles")
      .select(["fmf_member_id"])
      .where("user_id", "=", user.id)
      .executeTakeFirst();

    let memberId = existing?.fmf_member_id ?? null;
    for (let attempt = 0; attempt < 10 && !memberId; attempt++) {
      const seq = await sql<{ id: string }>`select nextval('fmf_member_seq') as id`.execute(db);
      const idRow = seq.rows[0];
      if (!idRow) throw new Error("Failed to allocate a member id.");
      const candidate = formatMemberId(Number(idRow.id));
      const clash = await db
        .selectFrom("member_profiles")
        .select("user_id")
        .where("fmf_member_id", "=", candidate)
        .executeTakeFirst();
      if (!clash) memberId = candidate;
    }
    if (!memberId) throw new Error("Could not allocate a unique member id.");

    await db.transaction().execute(async (tx) => {
      await tx
        .updateTable("member_profiles")
        .set({ fmf_member_id: memberId, onboarding_status: "active" })
        .where("user_id", "=", user.id)
        .execute();

      await writeAudit(tx, {
        actorId: user.id,
        action: "member.activate",
        entity: "member_profiles",
        entityId: user.id,
        details: { fmf_member_id: memberId },
      });
    });

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
    return { ok: true, fmfMemberId: memberId };
  } catch (e) {
    console.error("[finishOnboarding] failed:", e);
    return { ok: false, error: "Could not finish onboarding. Please try again." };
  }
}

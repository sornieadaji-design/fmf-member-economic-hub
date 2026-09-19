import { db } from "@/lib/db";
import { notifyMember } from "@/lib/email";

/**
 * Scheduled reminders (build spec §8, Phase 2). Pure logic, triggered by the cron route.
 * Emails go through notifyMember, which no-ops until RESEND_API_KEY is set — so this is safe
 * to run in dev. Returns the user ids notified in each category (handy for tests/logs).
 */
export async function runReminders(): Promise<{ kyc: string[]; contributionsDue: string[] }> {
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM

  // 1) Active members whose KYC is not yet verified.
  const kycRows = await db
    .selectFrom("member_profiles as p")
    .select(["p.user_id as id"])
    .where("p.onboarding_status", "=", "active")
    .where("p.kyc_status", "!=", "verified")
    .execute();

  // 2) Active cooperative/both members with no savings contribution recorded this period.
  const dueRows = await db
    .selectFrom("member_profiles as p")
    .select(["p.user_id as id"])
    .where("p.onboarding_status", "=", "active")
    .where("p.participation_option", "in", ["cooperative", "both"])
    .where((eb) =>
      eb.not(
        eb.exists(
          eb
            .selectFrom("contributions as c")
            .select("c.id")
            .whereRef("c.member_id", "=", "p.user_id")
            .where("c.type", "=", "savings")
            .where("c.period", "=", period),
        ),
      ),
    )
    .execute();

  for (const r of kycRows) {
    await notifyMember(r.id, "Complete your FMF verification", "Your identity verification is still pending. Please complete it in the app.");
  }
  for (const r of dueRows) {
    await notifyMember(r.id, `Your ${period} contribution reminder`, `A friendly reminder to record your ${period} savings contribution in the FMF Hub.`);
  }

  return { kyc: kycRows.map((r) => r.id), contributionsDue: dueRows.map((r) => r.id) };
}

import { db } from "@/lib/db";

/**
 * Transactional email (build spec §8). Uses Resend via its REST API (no extra dependency).
 * Degrades gracefully: with no RESEND_API_KEY it logs and no-ops, so dev and tests never
 * fail on email. NEVER call this inside a database transaction — send AFTER the commit so a
 * mail failure can't roll back a confirmed payment or approval, and it never throws.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email:noop] to=${to} subject="${subject}"`);
    return;
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "FMF Hub <onboarding@resend.dev>",
        to,
        subject,
        text,
      }),
    });
  } catch (e) {
    console.error("[email] send failed:", e);
  }
}

/** Look up a member's email and notify them. Never throws. */
export async function notifyMember(userId: string, subject: string, text: string): Promise<void> {
  try {
    const u = await db.selectFrom("users").select(["email"]).where("id", "=", userId).executeTakeFirst();
    if (u?.email) await sendEmail(u.email, subject, text);
  } catch (e) {
    console.error("[email] notifyMember failed:", e);
  }
}

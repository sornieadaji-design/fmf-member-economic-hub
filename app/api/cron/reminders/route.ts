import { runReminders } from "@/lib/reminders";

/**
 * Cron endpoint for scheduled reminders (build spec §8, Phase 2). Triggered by Vercel Cron
 * (see vercel.json). Protected by CRON_SECRET: when it is set, the request must carry
 * `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this automatically). With no
 * secret set (local dev) it runs unauthenticated for convenience.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  }

  const result = await runReminders();
  return Response.json({
    ok: true,
    kycReminders: result.kyc.length,
    contributionReminders: result.contributionsDue.length,
  });
}

import { requireMember } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils/format";

/**
 * CSV statement of the signed-in member's CONFIRMED contributions (build spec §6.3).
 * A route handler (not a server action) because the browser downloads the response.
 * Ownership is the session member — the query never accepts a member_id from the caller.
 */
export async function GET() {
  const user = await requireMember();

  const rows = await db
    .selectFrom("contributions")
    .select(["period", "type", "amount", "method", "payment_reference", "confirmed_date", "created_at"])
    .where("member_id", "=", user.id)
    .where("status", "=", "confirmed")
    .orderBy("created_at", "asc")
    .execute();

  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = ["Period", "Type", "Amount (NGN)", "Method", "Reference", "Confirmed"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        esc(r.period ?? ""),
        esc(r.type),
        esc(r.amount),
        esc(r.method),
        esc(r.payment_reference ?? ""),
        esc(r.confirmed_date ? formatDate(r.confirmed_date) : ""),
      ].join(","),
    );
  }

  const csv = lines.join("\n");
  const filename = `fmf-statement-${user.fmfMemberId ?? "member"}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

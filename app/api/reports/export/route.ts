import { requireOfficer } from "@/lib/auth/guards";
import { getReportTotals } from "@/lib/actions/admin/reports";

/**
 * CSV export of the per-pool report totals (build spec §6.8, §8). Officer-only. Each pool
 * is a separate row — the export never presents a merged cross-pool balance.
 */
export async function GET() {
  await requireOfficer();
  const t = await getReportTotals();

  const rows: [string, string | number][] = [
    ["Members (total)", t.members.total],
    ["Members (active)", t.members.active],
    ["Savings (confirmed)", t.contributionsByPool.savings],
    ["Welfare contributions (confirmed)", t.contributionsByPool.welfare],
    ["Investment contributions (confirmed)", t.contributionsByPool.investment],
    ["Registration (confirmed)", t.contributionsByPool.registration],
    ["Admin levy (confirmed)", t.contributionsByPool.admin_levy],
    ["Loan book outstanding", t.loanBook.outstanding],
    ["Loans approved (count)", t.loanBook.approvedCount],
    ["Loans disbursed (count)", t.loanBook.disbursedCount],
    ["Investment subscriptions allocated", t.subscriptions.allocated],
    ["Welfare paid", t.welfarePaid],
  ];

  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = ["Metric,Value (NGN where applicable)", ...rows.map(([k, v]) => `${esc(k)},${esc(v)}`)].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fmf-report-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

import { getReportTotals } from "@/lib/actions/admin/reports";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { formatNGN } from "@/lib/utils/format";

/**
 * Reports tab (build spec §6.8, §7.6). Every pool is summed independently — there is no
 * merged cross-pool balance anywhere. CSV export via the route handler.
 */
export default async function AdminReportsPage() {
  const t = await getReportTotals();

  const pools = [
    { label: "Savings (confirmed)", value: t.contributionsByPool.savings },
    { label: "Welfare contributions", value: t.contributionsByPool.welfare },
    { label: "Investment contributions", value: t.contributionsByPool.investment },
    { label: "Registration", value: t.contributionsByPool.registration },
    { label: "Admin levy", value: t.contributionsByPool.admin_levy },
    { label: "Loan book outstanding", value: t.loanBook.outstanding },
    { label: "Investment subscriptions allocated", value: t.subscriptions.allocated },
    { label: "Welfare paid", value: t.welfarePaid },
  ];

  return (
    <main className="container max-w-3xl space-y-6 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Reports</h1>
        <a href="/api/reports/export" className="text-sm text-primary underline">Export CSV</a>
      </header>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Members</CardDescription>
            <CardTitle className="text-lg">{t.members.active} active</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{t.members.total} total</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Loans</CardDescription>
            <CardTitle className="text-lg">{t.loanBook.disbursedCount} disbursed</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{t.loanBook.approvedCount} approved awaiting disbursement</CardContent>
        </Card>
      </div>

      <section className="grid grid-cols-2 gap-3">
        {pools.map((p) => (
          <Card key={p.label}>
            <CardHeader className="pb-2">
              <CardDescription>{p.label}</CardDescription>
              <CardTitle className="text-base">{formatNGN(p.value)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <p className="text-xs text-muted-foreground">
        Each pool is reported separately; figures are never merged into a single balance.
      </p>
    </main>
  );
}

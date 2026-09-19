import Link from "next/link";
import { requireActiveMemberPage } from "@/lib/auth/guards";
import { getDashboardSummary, listMyContributions } from "@/lib/actions/contributions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatNGN, formatDate } from "@/lib/utils/format";

/**
 * Member dashboard (build spec §6.2). Every figure is for THIS member only and each
 * fund pool is shown on its own card — savings, welfare, loan balance and investment
 * subscriptions are never merged into a single balance (CLAUDE.md §3.5).
 */
export default async function DashboardPage() {
  const user = await requireActiveMemberPage();
  const [summary, recent] = await Promise.all([
    getDashboardSummary(),
    listMyContributions(),
  ]);

  const pools = [
    { label: "Confirmed savings", value: summary.confirmedSavings, href: "/contributions" },
    { label: "Welfare contributions", value: summary.confirmedWelfare, href: "/contributions" },
    { label: "Loan balance", value: summary.loanOutstanding, href: "/loans" },
    { label: "Investment subscriptions", value: summary.investmentSubscriptions, href: "/investments" },
  ];

  return (
    <main className="container max-w-2xl space-y-6 py-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-primary">Your dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {user.fmfMemberId ? `Member ${user.fmfMemberId} · ` : ""}
          {user.email}
        </p>
      </header>

      {(summary.pendingContributionCount > 0 || !summary.kycVerified) && (
        <div className="space-y-2">
          {summary.pendingContributionCount > 0 && (
            <p className="rounded-md border border-input bg-muted/40 p-3 text-sm">
              You have {summary.pendingContributionCount} contribution
              {summary.pendingContributionCount > 1 ? "s" : ""} awaiting officer confirmation.
            </p>
          )}
          {!summary.kycVerified && (
            <p className="rounded-md border border-input bg-muted/40 p-3 text-sm">
              Your identity verification is not yet complete.
            </p>
          )}
        </div>
      )}

      {/* Each pool is a separate card — never a merged total (CLAUDE.md §3.5). */}
      <section className="grid grid-cols-2 gap-3">
        {pools.map((p) => (
          <Card key={p.label}>
            <CardHeader className="pb-2">
              <CardDescription>{p.label}</CardDescription>
              <CardTitle className="text-lg">{formatNGN(p.value)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/contributions" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Make a contribution
        </Link>
        <Link href="/loans" className="rounded-md border border-input px-4 py-2 text-sm font-medium">
          Apply for a loan
        </Link>
        <Link href="/investments" className="rounded-md border border-input px-4 py-2 text-sm font-medium">
          Investment opportunities
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Recent activity</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contributions yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {recent.slice(0, 5).map((c) => (
              <li key={c.id} className="flex items-center justify-between p-3 text-sm">
                <span className="capitalize">
                  {c.type} · {c.period ?? formatDate(c.created_at)}
                </span>
                <span className="flex items-center gap-2">
                  <span>{formatNGN(c.amount)}</span>
                  <StatusBadge status={c.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Investments carry risk. Returns are not guaranteed.
      </p>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "confirmed"
      ? "bg-primary/10 text-primary"
      : status === "rejected"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  return <span className={`rounded px-2 py-0.5 text-xs capitalize ${tone}`}>{status}</span>;
}

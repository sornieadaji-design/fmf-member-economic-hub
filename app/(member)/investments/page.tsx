import Link from "next/link";
import { requireActiveMemberPage } from "@/lib/auth/guards";
import { isInvestmentMember, listOpenOpportunities, listMySubscriptions } from "@/lib/actions/investments";
import { SubscribeCard } from "@/components/investments/SubscribeCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNGN } from "@/lib/utils/format";
import { INVESTMENT_RISK_COPY, RISK_LEVEL_LABELS } from "@/lib/constants/investments";

/**
 * Investment room (build spec §6.5). Visible only to members enrolled in investment|both.
 * Every card shows the risk disclosure; no projected/guaranteed return is ever displayed.
 */
export default async function InvestmentsPage() {
  await requireActiveMemberPage();
  const enrolled = await isInvestmentMember();

  if (!enrolled) {
    return (
      <main className="container max-w-2xl space-y-4 py-8">
        <h1 className="text-xl font-semibold text-primary">Investment room</h1>
        <p className="text-sm text-muted-foreground">
          You are not currently enrolled in the Investment Club. Speak to an officer to update your
          participation if you would like to take part.
        </p>
        <Link href="/dashboard" className="text-sm text-primary underline">Back to dashboard</Link>
      </main>
    );
  }

  const [opportunities, subscriptions] = await Promise.all([
    listOpenOpportunities(),
    listMySubscriptions(),
  ]);

  return (
    <main className="container max-w-2xl space-y-6 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Investment room</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground underline">Dashboard</Link>
      </header>

      <div className="rounded-md border border-accent/30 bg-accent/5 p-3 text-sm text-accent">
        {INVESTMENT_RISK_COPY}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Open opportunities</h2>
        {opportunities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open opportunities right now.</p>
        ) : (
          opportunities.map((o) => <SubscribeCard key={o.id} opp={o} />)
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Your subscriptions</h2>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">You have no subscriptions yet.</p>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {subscriptions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 text-sm">
                  <span>
                    {s.title}
                    <span className="block text-xs text-muted-foreground">
                      {RISK_LEVEL_LABELS[s.risk_level] ?? s.risk_level} risk
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span>{formatNGN(s.amount)}</span>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                      {s.status}
                    </span>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}

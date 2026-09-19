import {
  listOpportunitiesAdmin,
  listSubscriptionsAdmin,
  setOpportunityStatus,
  recordSubscriptionApproval,
} from "@/lib/actions/admin/investments";
import { OpportunityForm } from "@/components/admin/OpportunityForm";
import { ActionButton } from "@/components/admin/ActionButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNGN } from "@/lib/utils/format";
import { RISK_LEVEL_LABELS } from "@/lib/constants/investments";

/** Investments tab (build spec §6.8, §7.4): manage opportunities; allocate via two approvals. */
export default async function AdminInvestmentsPage() {
  const [opps, subs] = await Promise.all([listOpportunitiesAdmin(), listSubscriptionsAdmin()]);

  return (
    <main className="container max-w-4xl space-y-6 py-6">
      <h1 className="text-xl font-semibold text-primary">Investments</h1>

      <OpportunityForm />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Opportunities</h2>
        {opps.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          opps.map((o) => (
            <Card key={o.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
                <div>
                  <p className="font-medium">{o.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {RISK_LEVEL_LABELS[o.risk_level] ?? o.risk_level} risk · min {formatNGN(o.min_subscription ?? 0)} · raised {formatNGN(o.raised_amount)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">{o.status}</span>
                  {o.status !== "open" && <ActionButton action={setOpportunityStatus.bind(null, o.id, "open")} successText="Opened">Open</ActionButton>}
                  {o.status === "open" && <ActionButton action={setOpportunityStatus.bind(null, o.id, "closed")} variant="outline" successText="Closed">Close</ActionButton>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Subscriptions</h2>
        {subs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
        ) : (
          subs.map((s) => {
            const open = ["requested", "approved"].includes(s.status);
            return (
              <Card key={s.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
                  <div>
                    <p className="font-medium">{formatNGN(s.amount)} · {s.opportunity_title}</p>
                    <p className="text-xs text-muted-foreground">{s.member_name ?? "Member"} · approvals {s.approvals} of 2</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">{s.status}</span>
                    {open && <ActionButton action={recordSubscriptionApproval.bind(null, s.id)} successText="Approval recorded">Approve</ActionButton>}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </main>
  );
}

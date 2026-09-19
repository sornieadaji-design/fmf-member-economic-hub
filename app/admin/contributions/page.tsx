import { listAllContributions, confirmContribution, rejectContribution } from "@/lib/actions/admin/contributions";
import { ActionButton } from "@/components/admin/ActionButton";
import { Card, CardContent } from "@/components/ui/card";
import { formatNGN, formatDate } from "@/lib/utils/format";

/** Contributions tab (build spec §6.8, §7.2): officer confirmation (writes audit). */
export default async function AdminContributionsPage() {
  const rows = await listAllContributions();
  const pending = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending");

  return (
    <main className="container max-w-4xl space-y-6 py-6">
      <h1 className="text-xl font-semibold text-primary">Contributions</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Pending confirmation ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing awaiting confirmation.</p>
        ) : (
          pending.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
                <div>
                  <p className="font-medium">{formatNGN(c.amount)} · <span className="capitalize">{c.type}</span></p>
                  <p className="text-xs text-muted-foreground">
                    {c.member_name ?? "Member"}{c.fmf_member_id ? ` · ${c.fmf_member_id}` : ""} · {c.period ?? formatDate(c.created_at)}
                    {c.payment_reference ? ` · ref ${c.payment_reference}` : ""}
                  </p>
                  {c.receipt_url && (
                    <a href={c.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">View receipt</a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ActionButton action={confirmContribution.bind(null, c.id)} successText="Confirmed">Confirm</ActionButton>
                  <ActionButton action={rejectContribution.bind(null, c.id)} variant="outline" successText="Rejected">Reject</ActionButton>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Decided</h2>
        {decided.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {decided.slice(0, 50).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 text-sm">
                  <span>{c.member_name ?? "Member"} · <span className="capitalize">{c.type}</span></span>
                  <span className="flex items-center gap-2">
                    <span>{formatNGN(c.amount)}</span>
                    <span className={"rounded px-2 py-0.5 text-xs capitalize " + (c.status === "confirmed" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>{c.status}</span>
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

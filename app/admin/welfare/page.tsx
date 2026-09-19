import { listAllWelfare, recordWelfareDecision, markWelfarePaid } from "@/lib/actions/admin/welfare";
import { getNumericSetting, SETTINGS_KEYS, DEFAULT_WELFARE_THRESHOLD } from "@/lib/settings";
import { ActionButton } from "@/components/admin/ActionButton";
import { Card, CardContent } from "@/components/ui/card";
import { formatNGN, formatDate } from "@/lib/utils/format";

/** Welfare tab (build spec §6.8, §10): above-threshold payouts need two distinct officers. */
export default async function AdminWelfarePage() {
  const [claims, threshold] = await Promise.all([
    listAllWelfare(),
    getNumericSetting(SETTINGS_KEYS.welfareApprovalThreshold, DEFAULT_WELFARE_THRESHOLD),
  ]);

  return (
    <main className="container max-w-4xl space-y-4 py-6">
      <h1 className="text-xl font-semibold text-primary">Welfare</h1>
      <p className="text-sm text-muted-foreground">
        Payouts above {formatNGN(threshold)} require two distinct officers to approve.
      </p>

      {claims.length === 0 ? (
        <p className="text-sm text-muted-foreground">No welfare requests yet.</p>
      ) : (
        claims.map((c) => {
          const amount = Number(c.amount_requested);
          const required = amount > threshold ? 2 : 1;
          const open = ["submitted", "under_review"].includes(c.status);
          return (
            <Card key={c.id}>
              <CardContent className="space-y-2 py-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium capitalize">{c.category} · {formatNGN(c.amount_requested)}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.member_name ?? "Member"}{c.fmf_member_id ? ` · ${c.fmf_member_id}` : ""} · {formatDate(c.created_at)}
                    </p>
                  </div>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">{c.status.replace("_", " ")}</span>
                </div>
                {c.reason && <p className="text-muted-foreground">{c.reason}</p>}
                {c.evidence_url && (
                  <a href={c.evidence_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">View evidence</a>
                )}
                <p className="text-xs text-muted-foreground">Approvals: {c.approvals} of {required}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {open && (
                    <>
                      <ActionButton action={recordWelfareDecision.bind(null, c.id, "approved")} successText="Approval recorded">Approve</ActionButton>
                      <ActionButton action={recordWelfareDecision.bind(null, c.id, "rejected")} variant="outline" successText="Rejected">Reject</ActionButton>
                    </>
                  )}
                  {c.status === "approved" && (
                    <ActionButton action={markWelfarePaid.bind(null, c.id)} successText="Marked paid">Mark paid</ActionButton>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </main>
  );
}

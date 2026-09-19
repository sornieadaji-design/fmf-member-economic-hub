import Link from "next/link";
import { requireActiveMemberPage } from "@/lib/auth/guards";
import { listMyLoans } from "@/lib/actions/loans";
import { LoanApplyForm } from "@/components/loans/LoanApplyForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNGN, formatDate } from "@/lib/utils/format";
import { REQUIRED_LOAN_APPROVALS } from "@/lib/constants/loans";

/**
 * Member loans screen (build spec §6.4). A member applies for a loan and tracks its
 * status and two-officer approval progress. Officer-only decision notes are never shown.
 */
export default async function LoansPage() {
  await requireActiveMemberPage();
  const loans = await listMyLoans();

  return (
    <main className="container max-w-2xl space-y-6 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Loans</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground underline">
          Dashboard
        </Link>
      </header>

      <LoanApplyForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your loans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loans.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no loans yet.</p>
          ) : (
            loans.map((l) => {
              const approvals = Math.min(l.approval_count, REQUIRED_LOAN_APPROVALS);
              return (
                <div key={l.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{formatNGN(l.amount)}</span>
                    <StatusBadge status={l.status} />
                  </div>
                  <p className="mt-1 text-muted-foreground">{l.purpose}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between"><dt>Tenor</dt><dd>{l.tenor_months ?? "—"} mo</dd></div>
                    <div className="flex justify-between"><dt>Interest</dt><dd>{l.interest_rate ?? "—"}%</dd></div>
                    <div className="flex justify-between"><dt>Outstanding</dt><dd>{formatNGN(l.outstanding_balance)}</dd></div>
                    <div className="flex justify-between"><dt>Applied</dt><dd>{formatDate(l.created_at)}</dd></div>
                  </dl>
                  {["applied", "under_review"].includes(l.status) && (
                    <p className="mt-2 text-xs">
                      Approval progress: <strong>{approvals} of {REQUIRED_LOAN_APPROVALS}</strong> officers.
                      Two distinct officers are required.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "approved" || status === "disbursed"
      ? "bg-primary/10 text-primary"
      : status === "rejected"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  return <span className={`rounded px-2 py-0.5 text-xs capitalize ${tone}`}>{status.replace("_", " ")}</span>;
}

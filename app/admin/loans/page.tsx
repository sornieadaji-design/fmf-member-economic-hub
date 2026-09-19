import { listAllLoans, listLoanApprovals } from "@/lib/actions/loans";
import { LoanApprovalControls } from "@/components/admin/LoanApprovalControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNGN, formatDate } from "@/lib/utils/format";

/**
 * Admin loan book (build spec §6.8, §7.3). Officers record approvals here; a loan can
 * only reach `approved` when two DISTINCT officers approve (DB-enforced). Every action
 * writes to the immutable audit log.
 */
export default async function AdminLoansPage() {
  const loans = await listAllLoans();
  const approvalsByLoan = await Promise.all(loans.map((l) => listLoanApprovals(l.id)));

  return (
    <main className="container max-w-3xl space-y-4 py-6">
      <h1 className="text-xl font-semibold text-primary">Loan book</h1>
      <p className="text-sm text-muted-foreground">
        Loans advance to <strong>Approved</strong> only after two different officers approve.
        You cannot approve the same loan twice.
      </p>

      {loans.length === 0 ? (
        <p className="text-sm text-muted-foreground">No loans have been applied for yet.</p>
      ) : (
        loans.map((loan, i) => (
          <Card key={loan.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{formatNGN(loan.amount)}</CardTitle>
                <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize">
                  {loan.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {loan.member_name ?? "Member"}
                {loan.fmf_member_id ? ` · ${loan.fmf_member_id}` : ""} · applied {formatDate(loan.created_at)}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{loan.purpose}</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between"><dt>Tenor</dt><dd>{loan.tenor_months ?? "—"} mo</dd></div>
                <div className="flex justify-between"><dt>Outstanding</dt><dd>{formatNGN(loan.outstanding_balance)}</dd></div>
              </dl>
              {loan.decision_notes && (
                <p className="mt-2 rounded bg-muted/40 p-2 text-xs">
                  <span className="font-medium">Officer notes:</span> {loan.decision_notes}
                </p>
              )}
              <LoanApprovalControls
                loanId={loan.id}
                status={loan.status}
                approvals={approvalsByLoan[i] ?? []}
              />
            </CardContent>
          </Card>
        ))
      )}
    </main>
  );
}

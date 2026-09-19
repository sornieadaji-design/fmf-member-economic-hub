"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { recordLoanApproval, disburseLoan } from "@/lib/actions/loans";
import { REQUIRED_LOAN_APPROVALS } from "@/lib/constants/loans";

export interface ApprovalDisplay {
  approver_name: string | null;
  approver_role: string | null;
  decision: string;
}

export function LoanApprovalControls({
  loanId,
  status,
  approvals,
}: {
  loanId: string;
  status: string;
  approvals: ApprovalDisplay[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const approvedBy = approvals.filter((a) => a.decision === "approved");
  const canDecide = status === "applied" || status === "under_review";
  const canDisburse = status === "approved";

  function approve(decision: "approved" | "rejected") {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await recordLoanApproval({ loanId, decision, comment: "" });
      if (res.ok) {
        setMsg(
          decision === "rejected"
            ? "Loan rejected."
            : res.status === "approved"
              ? "Second approval recorded — loan is now Approved."
              : `Approval recorded (${res.approvals} of ${REQUIRED_LOAN_APPROVALS}). A different officer must approve too.`,
        );
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  function disburse() {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await disburseLoan({ loanId });
      if (res.ok) {
        setMsg("Loan marked as disbursed.");
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <p className="text-xs text-muted-foreground">
        Approved by:{" "}
        {approvedBy.length === 0
          ? "no officers yet"
          : approvedBy.map((a) => a.approver_name ?? a.approver_role ?? "officer").join(", ")}{" "}
        ({approvedBy.length} of {REQUIRED_LOAN_APPROVALS})
      </p>

      <div className="flex flex-wrap gap-2">
        {canDecide && (
          <>
            <Button size="sm" onClick={() => approve("approved")} disabled={pending}>
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => approve("rejected")} disabled={pending}>
              Reject
            </Button>
          </>
        )}
        {canDisburse && (
          <Button size="sm" onClick={disburse} disabled={pending}>
            Mark disbursed
          </Button>
        )}
        {!canDecide && !canDisburse && (
          <span className="text-xs text-muted-foreground">No actions available.</span>
        )}
      </div>

      {msg && <p className="text-xs text-primary">{msg}</p>}
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}

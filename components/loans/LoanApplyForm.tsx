"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { applyForLoan } from "@/lib/actions/loans";
import { applyLoanSchema } from "@/lib/validation/loans";
import { MAX_TENOR_MONTHS } from "@/lib/constants/loans";

export function LoanApplyForm() {
  const router = useRouter();
  const [amount, setAmount] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [tenor, setTenor] = React.useState("6");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  function submit() {
    setError(null);
    setDone(false);
    const value = { amount, purpose: purpose.trim(), tenorMonths: tenor };
    const parsed = applyLoanSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    startTransition(async () => {
      const res = await applyForLoan(parsed.data);
      if (res.ok) {
        setDone(true);
        setAmount("");
        setPurpose("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Apply for a loan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="loan-amount">Amount (₦)</Label>
            <Input id="loan-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loan-tenor">Tenor (months)</Label>
            <Input id="loan-tenor" inputMode="numeric" value={tenor} onChange={(e) => setTenor(e.target.value)} placeholder="6" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loan-purpose">Purpose</Label>
          <Textarea id="loan-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="What is the loan for?" />
        </div>

        <p className="text-xs text-muted-foreground">
          Loans are subject to the loan policy and require approval by <strong>two different
          officers</strong> before they can be approved. Maximum tenor is {MAX_TENOR_MONTHS} months.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {done && <p className="text-sm text-primary">Application submitted. It now needs two officer approvals.</p>}

        <Button onClick={submit} disabled={pending}>
          {pending ? "Submitting…" : "Submit application"}
        </Button>
      </CardContent>
    </Card>
  );
}

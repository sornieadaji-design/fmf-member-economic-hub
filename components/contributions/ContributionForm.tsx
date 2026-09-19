"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNGN } from "@/lib/utils/format";
import { uploadMemberFile } from "@/lib/actions/uploads";
import { recordContribution } from "@/lib/actions/contributions";
import { recordContributionSchema } from "@/lib/validation/contributions";

const TYPES = [
  { value: "savings", label: "Savings" },
  { value: "welfare", label: "Welfare" },
  { value: "investment", label: "Investment" },
] as const;

const METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
] as const;

const inputClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ContributionForm() {
  const router = useRouter();
  const [type, setType] = React.useState<(typeof TYPES)[number]["value"]>("savings");
  const [amount, setAmount] = React.useState("");
  const [period, setPeriod] = React.useState(new Date().toISOString().slice(0, 7));
  const [method, setMethod] = React.useState<(typeof METHODS)[number]["value"]>("bank_transfer");
  const [reference, setReference] = React.useState("");
  const [receiptUrl, setReceiptUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function onPickReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("kind", "receipt");
    const res = await uploadMemberFile(fd);
    setUploading(false);
    if (res.ok) setReceiptUrl(res.url);
    else setError(res.error);
  }

  function submit() {
    setError(null);
    setDone(false);
    const value = {
      type,
      amount,
      period,
      method,
      paymentReference: reference.trim(),
      receiptUrl,
    };
    const parsed = recordContributionSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    startTransition(async () => {
      const res = await recordContribution(parsed.data);
      if (res.ok) {
        setDone(true);
        setAmount("");
        setReference("");
        setReceiptUrl("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Record a contribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Button
                key={t.value}
                type="button"
                size="sm"
                variant={type === t.value ? "default" : "outline"}
                onClick={() => setType(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (₦)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="period">Period</Label>
            <Input id="period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="method">Method</Label>
          <select
            id="method"
            className={inputClass}
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ref">Transfer reference (optional)</Label>
          <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="receipt">Receipt (optional)</Label>
          <Input id="receipt" type="file" accept="image/*,application/pdf" onChange={onPickReceipt} disabled={uploading} />
          {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
          {receiptUrl && <p className="text-xs text-primary">Receipt attached ✓</p>}
        </div>

        <p className="text-xs text-muted-foreground">
          Recorded as <strong>pending</strong>. No money moves in the app — an officer confirms your
          payment. You cannot confirm your own contribution.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {done && <p className="text-sm text-primary">Contribution recorded and awaiting confirmation.</p>}

        <Button onClick={submit} disabled={pending || uploading}>
          {pending ? "Recording…" : `Record ${amount ? formatNGN(Number(amount) || 0) : "contribution"}`}
        </Button>
      </CardContent>
    </Card>
  );
}

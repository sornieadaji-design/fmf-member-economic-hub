"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadMemberFile } from "@/lib/actions/uploads";
import { submitWelfareClaim } from "@/lib/actions/welfare";
import { welfareClaimSchema } from "@/lib/validation/governance";

const CATEGORIES = [
  { value: "bereavement", label: "Bereavement" },
  { value: "medical", label: "Medical" },
  { value: "emergency", label: "Emergency" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
] as const;

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function WelfareForm() {
  const router = useRouter();
  const [category, setCategory] = React.useState<(typeof CATEGORIES)[number]["value"]>("medical");
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [evidenceUrl, setEvidenceUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function onPickEvidence(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("kind", "welfare");
    const res = await uploadMemberFile(fd);
    setUploading(false);
    if (res.ok) setEvidenceUrl(res.url);
    else setError(res.error);
  }

  function submit() {
    setError(null);
    setDone(false);
    const value = { category, amountRequested: amount, reason: reason.trim(), evidenceUrl };
    const parsed = welfareClaimSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    startTransition(async () => {
      const res = await submitWelfareClaim(parsed.data);
      if (res.ok) {
        setDone(true);
        setAmount("");
        setReason("");
        setEvidenceUrl("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Request welfare support</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="wc-cat">Category</Label>
            <select id="wc-cat" className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wc-amt">Amount (₦)</Label>
            <Input id="wc-amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wc-reason">Reason</Label>
          <Textarea id="wc-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the need." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wc-file">Evidence (optional)</Label>
          <Input id="wc-file" type="file" accept="image/*,application/pdf" onChange={onPickEvidence} disabled={uploading} />
          {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
          {evidenceUrl && <p className="text-xs text-primary">Evidence attached ✓</p>}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {done && <p className="text-sm text-primary">Request submitted. An officer will review it.</p>}

        <Button onClick={submit} disabled={pending || uploading}>
          {pending ? "Submitting…" : "Submit request"}
        </Button>
      </CardContent>
    </Card>
  );
}

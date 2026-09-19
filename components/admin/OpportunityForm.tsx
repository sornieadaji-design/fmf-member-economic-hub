"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createOpportunity } from "@/lib/actions/admin/investments";
import { createOpportunitySchema } from "@/lib/validation/admin";
import { assetClass as assetClassEnum, riskLevel as riskLevelEnum } from "@/lib/validation/enums";
import { ASSET_CLASS_LABELS, RISK_LEVEL_LABELS, INVESTMENT_RISK_COPY } from "@/lib/constants/investments";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function OpportunityForm() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [assetClass, setAssetClass] = React.useState<(typeof assetClassEnum.options)[number]>(assetClassEnum.options[0]);
  const [riskLevel, setRiskLevel] = React.useState<(typeof riskLevelEnum.options)[number]>(riskLevelEnum.options[0]);
  const [minSub, setMinSub] = React.useState("");
  const [disclosureUrl, setDisclosureUrl] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  function submit() {
    setError(null);
    setDone(false);
    const value = {
      title: title.trim(),
      description: description.trim(),
      assetClass,
      riskLevel,
      minSubscription: minSub ? Number(minSub) : undefined,
      disclosureUrl: disclosureUrl.trim(),
    };
    const parsed = createOpportunitySchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    startTransition(async () => {
      const res = await createOpportunity(parsed.data);
      if (res.ok) {
        setDone(true);
        setTitle("");
        setDescription("");
        setMinSub("");
        setDisclosureUrl("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Create opportunity</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="o-title">Title</Label>
          <Input id="o-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="o-desc">Description</Label>
          <Textarea id="o-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Asset class</Label>
            <select className={selectClass} value={assetClass} onChange={(e) => setAssetClass(e.target.value as typeof assetClass)}>
              {assetClassEnum.options.map((a) => (<option key={a} value={a}>{ASSET_CLASS_LABELS[a] ?? a}</option>))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Risk level</Label>
            <select className={selectClass} value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as typeof riskLevel)}>
              {riskLevelEnum.options.map((r) => (<option key={r} value={r}>{RISK_LEVEL_LABELS[r] ?? r}</option>))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="o-min">Min subscription (₦)</Label>
            <Input id="o-min" inputMode="decimal" value={minSub} onChange={(e) => setMinSub(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="o-disc">Disclosure URL</Label>
            <Input id="o-disc" value={disclosureUrl} onChange={(e) => setDisclosureUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{INVESTMENT_RISK_COPY} Do not enter any projected or guaranteed return.</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {done && <p className="text-sm text-primary">Created as a draft. Open it to accept subscriptions.</p>}
        <Button onClick={submit} disabled={pending}>{pending ? "Creating…" : "Create (draft)"}</Button>
      </CardContent>
    </Card>
  );
}

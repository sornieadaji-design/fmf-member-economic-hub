"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatNGN, formatDate } from "@/lib/utils/format";
import { subscribeToOpportunity } from "@/lib/actions/investments";
import { subscribeSchema } from "@/lib/validation/governance";
import { INVESTMENT_RISK_COPY, RISK_LEVEL_LABELS, ASSET_CLASS_LABELS } from "@/lib/constants/investments";

export interface OpportunityCardData {
  id: string;
  title: string;
  description: string | null;
  asset_class: string;
  risk_level: string;
  min_subscription: string | null;
  disclosure_url: string | null;
  closes_on: Date | null;
}

export function SubscribeCard({ opp }: { opp: OpportunityCardData }) {
  const router = useRouter();
  const min = Number(opp.min_subscription ?? 0);
  const [amount, setAmount] = React.useState(min ? String(min) : "");
  const [ack, setAck] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  function submit() {
    setError(null);
    setDone(false);
    const value = { opportunityId: opp.id, amount, riskAcknowledged: ack as true };
    const parsed = subscribeSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    startTransition(async () => {
      const res = await subscribeToOpportunity(parsed.data);
      if (res.ok) {
        setDone(true);
        setAck(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{opp.title}</CardTitle>
          <span className="whitespace-nowrap rounded bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            {RISK_LEVEL_LABELS[opp.risk_level] ?? opp.risk_level} risk
          </span>
        </div>
        <CardDescription>
          {ASSET_CLASS_LABELS[opp.asset_class] ?? opp.asset_class}
          {min > 0 ? ` · min ${formatNGN(min)}` : ""}
          {opp.closes_on ? ` · closes ${formatDate(opp.closes_on)}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {opp.description && <p className="text-sm text-muted-foreground">{opp.description}</p>}
        {opp.disclosure_url && (
          <a href={opp.disclosure_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
            Read the disclosure document
          </a>
        )}

        <div className="space-y-1.5">
          <Label htmlFor={`amt-${opp.id}`}>Amount (₦)</Label>
          <Input id={`amt-${opp.id}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          <span className="text-muted-foreground">
            I understand that <strong>{INVESTMENT_RISK_COPY}</strong>
          </span>
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {done && <p className="text-sm text-primary">Subscription requested. It awaits officer allocation.</p>}

        <Button onClick={submit} disabled={pending}>
          {pending ? "Submitting…" : "Subscribe"}
        </Button>
      </CardContent>
    </Card>
  );
}

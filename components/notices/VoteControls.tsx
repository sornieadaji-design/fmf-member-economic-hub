"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { castVote } from "@/lib/actions/notices";

/**
 * One-vote-per-resolution controls. If the member has already voted (myChoice set) or the
 * resolution is closed, the options are read-only. A second vote is refused by the DB
 * unique constraint even if the UI were bypassed.
 */
export function VoteControls({
  resolutionId,
  options,
  status,
  myChoice,
}: {
  resolutionId: string;
  options: string[];
  status: string;
  myChoice: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [choice, setChoice] = React.useState<string | null>(myChoice);

  const locked = Boolean(myChoice) || status !== "open";

  function vote(option: string) {
    if (locked) return;
    setError(null);
    startTransition(async () => {
      const res = await castVote({ resolutionId, choice: option });
      if (res.ok) {
        setChoice(option);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = choice === opt;
          return (
            <Button
              key={opt}
              size="sm"
              variant={selected ? "default" : "outline"}
              disabled={pending || locked}
              onClick={() => vote(opt)}
            >
              {opt}
            </Button>
          );
        })}
      </div>
      {choice && <p className="text-xs text-primary">Your vote: {choice}</p>}
      {!choice && status !== "open" && <p className="text-xs text-muted-foreground">Voting is closed.</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

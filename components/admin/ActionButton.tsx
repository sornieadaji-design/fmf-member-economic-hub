"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";

type Result = { ok: true } | { ok: false; error: string };

/**
 * A small reusable button that runs a server action, refreshes on success, and surfaces
 * an inline message. Used across the admin console for one-click officer actions.
 */
export function ActionButton({
  action,
  children,
  successText,
  variant,
  size = "sm",
  confirm,
}: {
  action: () => Promise<Result>;
  children: React.ReactNode;
  successText?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  confirm?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  function run() {
    if (confirm && !window.confirm(confirm)) return;
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        setMsg(successText ?? "Done.");
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button size={size} variant={variant} onClick={run} disabled={pending}>
        {pending ? "Working…" : children}
      </Button>
      {msg && <span className="text-xs text-primary">{msg}</span>}
      {err && <span className="text-xs text-destructive">{err}</span>}
    </span>
  );
}

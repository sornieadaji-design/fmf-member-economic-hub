"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setMemberRole } from "@/lib/actions/admin/members";
import { staffRole as staffRoleEnum, userRole as userRoleEnum } from "@/lib/validation/enums";

const selectClass =
  "h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function MemberRoleForm({
  userId,
  currentRole,
  currentStaffRole,
}: {
  userId: string;
  currentRole: string;
  currentStaffRole: string;
}) {
  const router = useRouter();
  const [role, setRole] = React.useState(currentRole);
  const [staff, setStaff] = React.useState(currentStaffRole);
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  function save() {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await setMemberRole({
        userId,
        role: role as "admin" | "member",
        staffRole: staff as never,
      });
      if (res.ok) {
        setMsg("Saved.");
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  const changed = role !== currentRole || staff !== currentStaffRole;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className={selectClass} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
        {userRoleEnum.options.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <select className={selectClass} value={staff} onChange={(e) => setStaff(e.target.value)} aria-label="Office">
        {staffRoleEnum.options.map((r) => (
          <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
        ))}
      </select>
      <Button size="sm" variant="outline" onClick={save} disabled={pending || !changed}>
        {pending ? "Saving…" : "Save"}
      </Button>
      {msg && <span className="text-xs text-primary">{msg}</span>}
      {err && <span className="text-xs text-destructive">{err}</span>}
    </div>
  );
}

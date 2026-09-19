import { listMembers, verifyKyc, rejectKyc } from "@/lib/actions/admin/members";
import { MemberRoleForm } from "@/components/admin/MemberRoleForm";
import { ActionButton } from "@/components/admin/ActionButton";
import { Card, CardContent } from "@/components/ui/card";

/** Members tab (build spec §6.8): verify KYC, set office/role. */
export default async function AdminMembersPage() {
  const members = await listMembers();

  return (
    <main className="container max-w-4xl space-y-4 py-6">
      <h1 className="text-xl font-semibold text-primary">Members</h1>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members yet.</p>
      ) : (
        members.map((m) => (
          <Card key={m.user_id}>
            <CardContent className="space-y-3 py-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{m.name ?? m.email} {m.fmf_member_id ? `· ${m.fmf_member_id}` : ""}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.email} · {m.participation_option} · tier {m.tier} · onboarding {m.onboarding_status}
                  </p>
                </div>
                <span className={"rounded px-2 py-0.5 text-xs " + (m.kyc_status === "verified" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  KYC: {m.kyc_status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {m.kyc_status !== "verified" && (
                  <ActionButton action={verifyKyc.bind(null, m.user_id)} successText="KYC verified">Verify KYC</ActionButton>
                )}
                {m.kyc_status !== "rejected" && (
                  <ActionButton action={rejectKyc.bind(null, m.user_id)} variant="outline" successText="KYC rejected">Reject KYC</ActionButton>
                )}
              </div>

              <MemberRoleForm userId={m.user_id} currentRole={m.role} currentStaffRole={m.staff_role} />
            </CardContent>
          </Card>
        ))
      )}
    </main>
  );
}

import { listMembers } from "@/lib/actions/admin/members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STAGES = ["registered", "profile_complete", "kyc_complete", "consented", "tier_selected", "active"] as const;

/** Onboarding pipeline (build spec §6.8): members grouped by onboarding_status. */
export default async function AdminOnboardingPage() {
  const members = await listMembers();
  const byStage = Object.fromEntries(STAGES.map((s) => [s, members.filter((m) => m.onboarding_status === s)]));

  return (
    <main className="container max-w-3xl space-y-4 py-6">
      <h1 className="text-xl font-semibold text-primary">Onboarding pipeline</h1>
      {STAGES.map((stage) => (
        <Card key={stage}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base capitalize">
              {stage.replace(/_/g, " ")} <span className="text-muted-foreground">({byStage[stage]!.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byStage[stage]!.length === 0 ? (
              <p className="text-sm text-muted-foreground">None.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {byStage[stage]!.map((m) => (
                  <li key={m.user_id} className="flex justify-between">
                    <span>{m.name ?? m.email}</span>
                    <span className="text-xs text-muted-foreground">{m.fmf_member_id ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </main>
  );
}

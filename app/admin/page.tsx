import Link from "next/link";
import { requireOfficer } from "@/lib/auth/guards";
import { getApprovalQueue } from "@/lib/actions/admin/reports";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";

/** Admin overview (build spec §6.8): quick counts + links into each console tab. */
export default async function AdminHomePage() {
  const officer = await requireOfficer();
  const queue = await getApprovalQueue();

  const tiles = [
    { label: "Loans awaiting decision", value: queue.loans, href: "/admin/loans" },
    { label: "Welfare awaiting decision", value: queue.welfare, href: "/admin/welfare" },
    { label: "Subscriptions to allocate", value: queue.subscriptions, href: "/admin/investments" },
  ];

  return (
    <main className="container max-w-3xl space-y-6 py-6">
      <header>
        <h1 className="text-xl font-semibold text-primary">Admin console</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {officer.email} ({officer.staffRole.replace(/_/g, " ")}).
        </p>
      </header>

      <section className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card className="transition-colors hover:border-primary">
              <CardHeader className="pb-2">
                <CardDescription>{t.label}</CardDescription>
                <CardTitle className="text-2xl">{t.value}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>

      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Use the tabs above to review members, confirm contributions, approve loans and welfare,
          allocate investments, post communications, read the audit log, and export reports. Every
          sensitive action is recorded in the immutable audit log.
        </CardContent>
      </Card>
    </main>
  );
}

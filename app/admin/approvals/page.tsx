import Link from "next/link";
import { getApprovalQueue } from "@/lib/actions/admin/reports";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";

/** Approvals queue (build spec §6.8): items awaiting officer decisions, linking to each tab. */
export default async function AdminApprovalsPage() {
  const queue = await getApprovalQueue();
  const items = [
    { label: "Loans awaiting approval", value: queue.loans, href: "/admin/loans", note: "Each needs two distinct officers." },
    { label: "Welfare awaiting decision", value: queue.welfare, href: "/admin/welfare", note: "Above threshold needs two officers." },
    { label: "Subscriptions to allocate", value: queue.subscriptions, href: "/admin/investments", note: "Allocation needs two officers." },
  ];

  return (
    <main className="container max-w-3xl space-y-4 py-6">
      <h1 className="text-xl font-semibold text-primary">Approvals queue</h1>
      {items.map((i) => (
        <Link key={i.label} href={i.href}>
          <Card className="transition-colors hover:border-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>{i.label}</CardDescription>
                <CardTitle className="text-2xl">{i.value}</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">{i.note}</p>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </main>
  );
}

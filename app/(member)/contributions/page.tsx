import Link from "next/link";
import { requireActiveMemberPage } from "@/lib/auth/guards";
import { listMyContributions } from "@/lib/actions/contributions";
import { ContributionForm } from "@/components/contributions/ContributionForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNGN, formatDate } from "@/lib/utils/format";

/**
 * Contributions screen (build spec §6.3). A member sees only their own contributions,
 * records new (pending) ones, and can download a statement of confirmed contributions.
 * Officer confirmation happens in the admin console, not here.
 */
export default async function ContributionsPage() {
  await requireActiveMemberPage();
  const rows = await listMyContributions();
  const hasConfirmed = rows.some((r) => r.status === "confirmed");

  return (
    <main className="container max-w-2xl space-y-6 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Contributions</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground underline">
          Dashboard
        </Link>
      </header>

      <ContributionForm />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Your contributions</CardTitle>
          {hasConfirmed && (
            <a
              href="/api/contributions/statement"
              className="text-sm text-primary underline"
            >
              Download statement
            </a>
          )}
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven&apos;t recorded any contributions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-3 font-medium">Period</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">Amount</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">{r.period ?? formatDate(r.created_at)}</td>
                      <td className="py-2 pr-3 capitalize">{r.type}</td>
                      <td className="py-2 pr-3">{formatNGN(r.amount)}</td>
                      <td className="py-2">
                        <span
                          className={
                            "rounded px-2 py-0.5 text-xs capitalize " +
                            (r.status === "confirmed"
                              ? "bg-primary/10 text-primary"
                              : r.status === "rejected"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-muted text-muted-foreground")
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

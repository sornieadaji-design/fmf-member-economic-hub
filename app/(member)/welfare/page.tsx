import Link from "next/link";
import { requireActiveMemberPage } from "@/lib/auth/guards";
import { listMyWelfareClaims } from "@/lib/actions/welfare";
import { WelfareForm } from "@/components/welfare/WelfareForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNGN, formatDate } from "@/lib/utils/format";

/** Welfare screen (build spec §6.6). A member submits and tracks their own claims. */
export default async function WelfarePage() {
  await requireActiveMemberPage();
  const claims = await listMyWelfareClaims();

  return (
    <main className="container max-w-2xl space-y-6 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Welfare</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground underline">Dashboard</Link>
      </header>

      <WelfareForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {claims.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no welfare requests yet.</p>
          ) : (
            claims.map((c) => (
              <div key={c.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{c.category}</span>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                    {c.status.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{c.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatNGN(c.amount_requested)} · {formatDate(c.created_at)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}

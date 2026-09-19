import Link from "next/link";
import { requireActiveMemberPage } from "@/lib/auth/guards";
import { listAnnouncementsForMe, listResolutionsForMe } from "@/lib/actions/notices";
import { VoteControls } from "@/components/notices/VoteControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";

/**
 * Notices, documents & voting (build spec §6.7). Announcements respect audience; open
 * resolutions accept one vote per member (DB-enforced); closed resolutions are read-only.
 */
export default async function NoticesPage() {
  await requireActiveMemberPage();
  const [announcements, resolutions] = await Promise.all([
    listAnnouncementsForMe(),
    listResolutionsForMe(),
  ]);

  return (
    <main className="container max-w-2xl space-y-6 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Notices &amp; governance</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground underline">Dashboard</Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Announcements</h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          announcements.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{a.title}</CardTitle>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                    {a.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(a.created_at)}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {a.body && <p className="whitespace-pre-line text-sm text-muted-foreground">{a.body}</p>}
                {a.file_url && (
                  <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                    View attachment
                  </a>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Resolutions</h2>
        {resolutions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No resolutions to show.</p>
        ) : (
          resolutions.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{r.title}</CardTitle>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                    {r.status}
                  </span>
                </div>
                {r.closes_on && <p className="text-xs text-muted-foreground">Closes {formatDate(r.closes_on)}</p>}
              </CardHeader>
              <CardContent>
                {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                <VoteControls
                  resolutionId={r.id}
                  options={r.options}
                  status={r.status}
                  myChoice={r.myChoice}
                />
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </main>
  );
}

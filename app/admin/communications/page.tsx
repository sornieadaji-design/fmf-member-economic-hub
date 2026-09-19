import { listResolutionsAdmin, setResolutionStatus } from "@/lib/actions/admin/communications";
import { AnnouncementForm, ResolutionForm } from "@/components/admin/CommunicationsForms";
import { ActionButton } from "@/components/admin/ActionButton";
import { Card, CardContent } from "@/components/ui/card";

/** Communications tab (build spec §6.8): announcements, policies and resolutions. */
export default async function AdminCommunicationsPage() {
  const resolutions = await listResolutionsAdmin();

  return (
    <main className="container max-w-3xl space-y-6 py-6">
      <h1 className="text-xl font-semibold text-primary">Communications</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <AnnouncementForm />
        <ResolutionForm />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Resolutions</h2>
        {resolutions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No resolutions yet.</p>
        ) : (
          resolutions.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.votes} vote(s) · options: {r.options.join(", ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">{r.status}</span>
                  {r.status === "open"
                    ? <ActionButton action={setResolutionStatus.bind(null, r.id, "closed")} variant="outline" successText="Closed">Close</ActionButton>
                    : <ActionButton action={setResolutionStatus.bind(null, r.id, "open")} successText="Opened">Open</ActionButton>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </main>
  );
}

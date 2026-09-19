import { listAuditLog } from "@/lib/actions/admin/audit";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";

/**
 * Audit tab (build spec §6.8, §7.5). READ-ONLY by construction: there is no edit or delete
 * control here or anywhere, and audit_logs is append-only at the database.
 */
export default async function AdminAuditPage() {
  const rows = await listAuditLog(200);

  return (
    <main className="container max-w-4xl space-y-4 py-6">
      <h1 className="text-xl font-semibold text-primary">Audit log</h1>
      <p className="text-sm text-muted-foreground">
        Append-only record of every sensitive action. It cannot be edited or deleted by anyone.
      </p>
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="p-3 font-medium">When</th>
                    <th className="p-3 font-medium">Actor</th>
                    <th className="p-3 font-medium">Action</th>
                    <th className="p-3 font-medium">Entity</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="p-3 text-muted-foreground">{formatDate(r.created_at)}</td>
                      <td className="p-3">{r.actor_name ?? "—"}</td>
                      <td className="p-3 font-mono text-xs">{r.action}</td>
                      <td className="p-3 text-xs text-muted-foreground">{r.entity ?? "—"}</td>
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

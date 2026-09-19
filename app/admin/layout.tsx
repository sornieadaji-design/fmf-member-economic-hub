import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSignedIn } from "@/lib/auth/guards";
import { BrandHeader } from "@/components/brand/BrandHeader";

/**
 * Officer-only gate for the whole /admin console (CLAUDE.md §4, build spec §6.8).
 * Node-runtime and authoritative; middleware only does a coarse redirect. Each admin
 * action still re-checks with requireOfficer(). A non-officer is sent to their dashboard.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSignedIn();
  if (user.role !== "admin") {
    redirect("/dashboard");
  }
  return (
    <>
      <BrandHeader href="/admin" />
      <div className="border-b bg-muted/30">
        <nav className="container flex flex-wrap gap-x-4 gap-y-1 py-2 text-sm">
          {[
            ["/admin", "Overview"],
            ["/admin/members", "Members"],
            ["/admin/onboarding", "Onboarding"],
            ["/admin/contributions", "Contributions"],
            ["/admin/loans", "Loans"],
            ["/admin/welfare", "Welfare"],
            ["/admin/investments", "Investments"],
            ["/admin/approvals", "Approvals"],
            ["/admin/communications", "Communications"],
            ["/admin/audit", "Audit"],
            ["/admin/reports", "Reports"],
          ].map(([href, label]) => href && (
            <Link key={href} href={href} className="text-muted-foreground hover:text-foreground">
              {label}
            </Link>
          ))}
          <Link href="/dashboard" className="ml-auto text-muted-foreground hover:text-foreground">← Member view</Link>
        </nav>
      </div>
      {children}
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSignedIn } from "@/lib/auth/guards";
import { BrandHeader } from "@/components/brand/BrandHeader";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/contributions", label: "Contributions" },
  { href: "/loans", label: "Loans" },
  { href: "/investments", label: "Investments" },
  { href: "/welfare", label: "Welfare" },
  { href: "/notices", label: "Notices" },
];

/**
 * Gate for the whole (member) route group (build spec §7.1). Runs on the Node runtime,
 * so it is the authoritative onboarding gate — middleware.ts only does a coarse redirect.
 *
 * A signed-in member whose onboarding is not 'active' is sent back to the wizard and
 * cannot reach /dashboard or any transactional route. Each page still calls
 * requireMember() itself (defence in depth, CLAUDE.md §4).
 */
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSignedIn();
  if (user.onboardingStatus !== "active") {
    redirect("/onboarding");
  }
  return (
    <>
      <BrandHeader />
      <div className="border-b bg-muted/30">
        <nav className="container flex flex-wrap gap-x-4 gap-y-1 py-2 text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-muted-foreground hover:text-foreground">
              {item.label}
            </Link>
          ))}
          {user.role === "admin" && (
            <Link href="/admin" className="ml-auto font-medium text-accent">
              Admin
            </Link>
          )}
        </nav>
      </div>
      {children}
    </>
  );
}

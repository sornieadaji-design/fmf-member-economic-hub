import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

/**
 * Slim brand strip used at the top of member/onboarding screens: the navy→red gradient
 * bar (echoing the logo's bridge arc) over a compact logo + wordmark.
 */
export function BrandHeader({ href = "/dashboard" }: { href?: string }) {
  return (
    <header>
      <div className="brand-bar h-1.5 w-full" />
      <div className="container flex items-center gap-3 py-3">
        <Link href={href} className="flex items-center gap-2">
          <Logo className="h-8 w-auto" />
          <span className="text-sm font-semibold text-primary">
            FMF <span className="text-accent">Economic Hub</span>
          </span>
        </Link>
      </div>
    </header>
  );
}

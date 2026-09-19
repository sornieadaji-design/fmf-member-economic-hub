import Link from "next/link";
import {
  PiggyBank,
  Briefcase,
  Scale,
  UsersRound,
  ScrollText,
  Layers,
  Lock,
  ArrowRight,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/brand/Logo";
import { SITE } from "@/lib/site";

/**
 * Public marketing landing page (SEO-optimised, mobile-first). Copy is deliberately
 * neutral: it states what the platform does without asserting registration, regulatory
 * status or any guaranteed return (CLAUDE.md §9).
 */

const features = [
  {
    icon: PiggyBank,
    title: "Cooperative Society",
    body: "Save regularly, request welfare support, and apply for member loans — each fund tracked on its own, never merged.",
  },
  {
    icon: Briefcase,
    title: "Investment Club",
    body: "Opt in to collective investment opportunities. Every one shows its risk and disclosure — and returns are never guaranteed.",
  },
  {
    icon: Scale,
    title: "Governance built in",
    body: "Members vote on resolutions, read notices, and see exactly how decisions and funds are handled.",
  },
];

const protections = [
  { icon: UsersRound, title: "No one acts alone", body: "Loans, allocations and large payouts need two different officers to approve." },
  { icon: ScrollText, title: "Immutable audit trail", body: "Every sensitive action is recorded permanently — it cannot be edited or deleted." },
  { icon: Layers, title: "Separate funds", body: "Savings, welfare, investment and registration are accounted for independently." },
  { icon: Lock, title: "Your data, protected", body: "Identity documents are visible only to you and authorised officers." },
];

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: SITE.org,
        url: SITE.url,
        logo: `${SITE.url}/fmf-logo.jpg`,
        description: SITE.description,
        areaServed: "Makurdi, Benue, Nigeria",
      },
      {
        "@type": "WebSite",
        name: SITE.name,
        url: SITE.url,
        inLanguage: "en-NG",
      },
    ],
  };
}

export default async function HomePage() {
  const session = await auth();
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }} />
      <div className="brand-bar h-1.5 w-full" />

      {/* Header */}
      <header className="border-b">
        <div className="container flex items-center justify-between py-3">
          <span className="flex items-center gap-2">
            <Logo className="h-8 w-auto" priority />
            <span className="text-sm font-semibold text-primary">
              FMF <span className="text-accent">Economic Hub</span>
            </span>
          </span>
          <Link
            href={session?.user ? "/dashboard" : "/api/auth/signin"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {session?.user ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-secondary/60 to-transparent" aria-hidden />
          <div className="container relative flex flex-col items-center gap-6 py-16 text-center md:py-24">
            <Logo className="h-20 w-auto" />
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-primary md:text-5xl">
              Save, borrow and invest <span className="text-accent">together</span> — transparently.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground md:text-lg">
              The members&apos; economic hub of the {SITE.org}. Cooperative savings, welfare and
              credit, plus an opt-in investment club — with every financial action recorded, approved
              and auditable.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={session?.user ? "/dashboard" : "/api/auth/signin"}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {session?.user ? "Go to your dashboard" : "Sign in to get started"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className="rounded-md border border-input px-5 py-2.5 text-sm font-medium hover:bg-muted">
                How it works
              </a>
            </div>
            <p className="text-xs text-muted-foreground">Members only · Sign in with your Google account</p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t bg-muted/20">
          <div className="container py-14 md:py-20">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-primary md:text-3xl">Two functions, one trusted system</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                A separately-governed cooperative society and investment club, under one role-controlled platform.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {features.map((f) => (
                <article key={f.title} className="rounded-lg border bg-card p-6 shadow-sm">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <f.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Protections */}
        <section className="border-t">
          <div className="container py-14 md:py-20">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-primary md:text-3xl">How your money is protected</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Governance is not an add-on here — it is enforced in the system itself.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {protections.map((p) => (
                <div key={p.title} className="flex gap-4 rounded-lg border p-5">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                    <p.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-secondary/40">
          <div className="container flex flex-col items-center gap-4 py-14 text-center">
            <h2 className="text-2xl font-semibold text-primary">Ready to join your members&apos; hub?</h2>
            <Link
              href={session?.user ? "/dashboard" : "/api/auth/signin"}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {session?.user ? "Open your dashboard" : "Sign in"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>© {year} {SITE.org}</p>
          <p>Investments carry risk. Returns are not guaranteed.</p>
        </div>
      </footer>
    </div>
  );
}

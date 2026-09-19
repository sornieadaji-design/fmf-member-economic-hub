/** Central site metadata, reused by layout metadata, JSON-LD, sitemap and robots. */
export const SITE = {
  name: "FMF Member Economic Hub",
  org: "Forum of Makurdi Friends Coop & Investment Club",
  tagline: "Save, borrow and invest together — transparently.",
  description:
    "A members-only economic hub for the Forum of Makurdi Friends Coop & Investment Club: cooperative savings, welfare and credit, plus an opt-in investment club. Every financial action is recorded, approved by two officers and auditable.",
  // Set NEXT_PUBLIC_SITE_URL in production (e.g. https://your-domain). Falls back to localhost in dev.
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  locale: "en_NG",
  keywords: [
    "FMF",
    "Forum of Makurdi Friends",
    "cooperative society",
    "savings and loans",
    "member welfare",
    "investment club",
    "Makurdi",
    "Benue",
    "Nigeria cooperative",
    "member economic hub",
  ],
} as const;

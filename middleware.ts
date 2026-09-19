import { NextResponse, type NextRequest } from "next/server";

/**
 * Coarse, EDGE-SAFE route protection.
 *
 * Middleware runs on the Edge runtime, which cannot load `pg` (Node crypto), so it must
 * NOT import the database-backed `auth()`. It therefore only checks for the PRESENCE of a
 * session cookie and bounces anonymous visitors to sign-in. It deliberately does not read
 * role or onboarding_status — those are enforced authoritatively on the Node runtime by
 * the layout guards (app/(member)/layout.tsx, app/admin/layout.tsx) and by requireMember/
 * requireOfficer inside every server action (CLAUDE.md §4). Cookie presence is a UX hint,
 * not a security check: the real session is validated server-side against the adapter.
 */
const MEMBER_PREFIXES = [
  "/dashboard",
  "/contributions",
  "/loans",
  "/investments",
  "/welfare",
  "/notices",
];

// Auth.js v5 database-session cookie names (dev + secure production variants).
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const path = nextUrl.pathname;

  const isProtected =
    path.startsWith("/admin") ||
    path === "/onboarding" ||
    path.startsWith("/onboarding/") ||
    MEMBER_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (!isProtected) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));
  if (!hasSession) {
    const url = new URL("/api/auth/signin", nextUrl);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/contributions/:path*",
    "/loans/:path*",
    "/investments/:path*",
    "/welfare/:path*",
    "/notices/:path*",
    "/admin/:path*",
    "/onboarding/:path*",
  ],
};

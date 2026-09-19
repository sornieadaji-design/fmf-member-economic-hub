"use client";

import Link from "next/link";

/**
 * Friendly fallback for the admin console. Office-gated pages (e.g. Audit requires the
 * auditor/president/administrator office) throw an AuthorizationError when an officer lacks
 * that office; without this boundary Next shows a raw server-side-exception page. This turns
 * any such failure into a clear, non-leaking message.
 */
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container max-w-lg space-y-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-primary">This section isn&apos;t available</h1>
      <p className="text-sm text-muted-foreground">
        You may not have the office required for this area, or something went wrong loading it.
        If you believe you should have access, contact an administrator.
      </p>
      <div className="flex justify-center gap-3">
        <button onClick={reset} className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted">
          Try again
        </button>
        <Link href="/admin" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Back to console
        </Link>
      </div>
    </main>
  );
}

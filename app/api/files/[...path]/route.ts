import type { NextRequest } from "next/server";
import { requireSignedIn, requireSelfOrOfficer, AuthorizationError } from "@/lib/auth/guards";

/**
 * Ownership-guarded file access (Phase-2 KYC confidentiality hardening; CLAUDE.md §3.7, §9).
 *
 * Uploads are namespaced `<kind>/<ownerUserId>/<file>`, so the owner is encoded in the path.
 * A member may fetch only their OWN files; officers may fetch any. The raw public blob URL is
 * never rendered in the app — members-facing pages link here, and this route streams the file
 * only after the guard passes.
 *
 * Note: the underlying blob store is still public-access, so a leaked raw blob URL would work.
 * The complete fix is private blobs + signed short-lived URLs, which needs a @vercel/blob
 * upgrade and a private store; this route removes raw-URL exposure and adds the access check.
 */
function blobBase(): string | null {
  const id = process.env.BLOB_STORE_ID?.replace(/^store_/, "").toLowerCase();
  return id ? `https://${id}.public.blob.vercel-storage.com/` : null;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  await requireSignedIn();
  const { path } = await ctx.params;
  if (!path || path.length < 3) return new Response("Not found", { status: 404 });

  const ownerId = path[1]!; // <kind>/<ownerUserId>/<file>
  try {
    await requireSelfOrOfficer(ownerId);
  } catch (e) {
    if (e instanceof AuthorizationError) return new Response("Forbidden", { status: 403 });
    throw e;
  }

  const base = blobBase();
  if (!base) return new Response("Storage not configured", { status: 500 });

  const pathname = path.map((s) => encodeURIComponent(s)).join("/");
  const upstream = await fetch(base + pathname);
  if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
    },
  });
}

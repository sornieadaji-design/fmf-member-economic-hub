"use server";

import { put } from "@vercel/blob";
import { requireSignedIn } from "@/lib/auth/guards";

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Upload a member file (KYC document, payment receipt, evidence) to Vercel Blob and
 * return its URL. The file is namespaced by the signed-in user's id. Access should be
 * restricted to the owner + officers — tighten with signed short-lived URLs in Phase 9
 * (build spec §8). Requires BLOB_READ_WRITE_TOKEN; until it is set this returns a clear
 * error so the flow degrades cleanly rather than throwing.
 */
export async function uploadMemberFile(formData: FormData): Promise<UploadResult> {
  const user = await requireSignedIn();
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: false, error: "File uploads are not configured yet (BLOB_READ_WRITE_TOKEN missing)." };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a file to upload." };
  }
  const kind = (formData.get("kind") as string) || "file";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  try {
    const blob = await put(`${kind}/${user.id}/${Date.now()}-${safeName}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    // Return the ownership-guarded app path, never the raw public blob URL (Phase-2 §9 hardening).
    return { ok: true, url: `/api/files/${blob.pathname}` };
  } catch {
    return { ok: false, error: "Upload failed. Please try again." };
  }
}

import { z } from "zod";

/**
 * A reference to an uploaded file. After the Phase-2 hardening, uploads return an
 * app-internal path (`/api/files/…`) served through an ownership-guarded route, so we
 * accept that path OR an absolute URL (for externally-hosted disclosures).
 */
export const fileRef = z
  .string()
  .min(1)
  .refine((v) => v.startsWith("/api/files/") || /^https?:\/\//.test(v), "Invalid file reference.");

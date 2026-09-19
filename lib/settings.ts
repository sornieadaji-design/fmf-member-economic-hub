import { db } from "@/lib/db";

/**
 * Config thresholds live in the `settings` table so the General Assembly can change them
 * without a deploy (build spec §10). Reads fall back to a default when unset.
 */
export const SETTINGS_KEYS = {
  welfareApprovalThreshold: "welfare_approval_threshold",
} as const;

/** Amount at/below which a welfare payout needs one approval; above it needs two (illustrative). */
export const DEFAULT_WELFARE_THRESHOLD = 100_000;

export async function getNumericSetting(key: string, fallback: number): Promise<number> {
  const row = await db.selectFrom("settings").select(["value"]).where("key", "=", key).executeTakeFirst();
  if (!row) return fallback;
  const n = Number(row.value);
  return Number.isFinite(n) ? n : fallback;
}

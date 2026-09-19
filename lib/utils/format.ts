/**
 * Formatting helpers. Use these everywhere — never format money or dates ad hoc.
 * Currency is the Nigerian Naira (₦); dates are day-month-year (CLAUDE.md §6).
 */

/** Format a Naira amount, e.g. 25000 -> "₦25,000.00". Pass a number of Naira (not kobo). */
export function formatNGN(amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return "₦0.00";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Format a date as dd-mm-yyyy, e.g. 19-09-2026. */
export function formatDate(input: Date | string | null | undefined): string {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** Build an FMF Member ID from a sequence number, e.g. 1 -> "FMF-0001". */
export function formatMemberId(sequence: number): string {
  return `FMF-${String(sequence).padStart(4, "0")}`;
}

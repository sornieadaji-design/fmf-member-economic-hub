/**
 * Loan policy constants (build spec §4.3, §10).
 *
 * ⚠️ ILLUSTRATIVE. The two-distinct-approvals floor is the non-negotiable control; the
 * interest rate and tenor bounds are placeholders to be set by the General Assembly and
 * stored in the settings table in a later phase, not hard policy.
 */
export const REQUIRED_LOAN_APPROVALS = 2;
export const DEFAULT_LOAN_INTEREST_RATE = 5; // annual %, indicative
export const MIN_TENOR_MONTHS = 1;
export const MAX_TENOR_MONTHS = 36;

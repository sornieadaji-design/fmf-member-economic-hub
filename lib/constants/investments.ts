/**
 * The risk disclosure shown on EVERY investment surface (CLAUDE.md §3.6, build spec §6.5).
 * No screen may display, imply or project a guaranteed or expected return; opportunities
 * carry a risk_level and a disclosure document, never a return figure.
 */
export const INVESTMENT_RISK_COPY = "Investments carry risk. Returns are not guaranteed.";

export const RISK_LEVEL_LABELS: Record<string, string> = {
  low: "Low",
  low_moderate: "Low–moderate",
  moderate: "Moderate",
  moderate_high: "Moderate–high",
  high: "High",
};

export const ASSET_CLASS_LABELS: Record<string, string> = {
  fixed_income: "Fixed income",
  money_market: "Money market",
  equities: "Equities",
  real_estate: "Real estate",
  private_business: "Private business",
  agriculture: "Agriculture",
  other: "Other",
};

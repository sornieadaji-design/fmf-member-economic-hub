/** Role vocabulary and office groupings used by the guards. */

export type UserRoleValue = "admin" | "member";

export type StaffRoleValue =
  | "member"
  | "president"
  | "vice_president"
  | "secretary"
  | "treasurer"
  | "financial_secretary"
  | "welfare_officer"
  | "loan_officer"
  | "investment_committee"
  | "trustee"
  | "auditor"
  | "administrator";

/**
 * Which offices may perform certain sensitive actions. These are convenience
 * groupings for finer checks (requireOfficer('treasurer')); the coarse gate is
 * always role === 'admin'. Tune membership to match adopted policy (build spec §10).
 */
export const OFFICE_GROUPS = {
  confirmContributions: ["treasurer", "financial_secretary", "administrator"],
  approveLoans: [
    "loan_officer",
    "treasurer",
    "president",
    "vice_president",
    "secretary",
    "administrator",
  ],
  allocateInvestments: ["investment_committee", "treasurer", "administrator"],
  approveWelfare: ["welfare_officer", "treasurer", "administrator"],
  postCommunications: ["secretary", "president", "vice_president", "administrator"],
  createOpportunities: ["investment_committee", "administrator"],
  readAudit: ["auditor", "president", "administrator"],
  verifyKyc: ["secretary", "financial_secretary", "administrator"],
  // Granting/removing admin and changing offices — the most sensitive officer action.
  manageRoles: ["president", "administrator"],
} satisfies Record<string, StaffRoleValue[]>;

export type OfficeGroup = keyof typeof OFFICE_GROUPS;

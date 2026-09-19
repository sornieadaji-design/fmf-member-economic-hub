import { z } from "zod";
import { approvalDecision } from "@/lib/validation/enums";
import { MIN_TENOR_MONTHS, MAX_TENOR_MONTHS } from "@/lib/constants/loans";

export const applyLoanSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Enter an amount." })
    .positive("Amount must be greater than zero.")
    .max(1_000_000_000, "That amount looks too large."),
  purpose: z.string().trim().min(3, "Describe the purpose of the loan.").max(500),
  tenorMonths: z.coerce
    .number({ invalid_type_error: "Enter a tenor." })
    .int("Tenor must be a whole number of months.")
    .min(MIN_TENOR_MONTHS, `Tenor must be at least ${MIN_TENOR_MONTHS} month.`)
    .max(MAX_TENOR_MONTHS, `Tenor cannot exceed ${MAX_TENOR_MONTHS} months.`),
});
export type ApplyLoanInput = z.infer<typeof applyLoanSchema>;

export const recordApprovalSchema = z.object({
  loanId: z.string().uuid(),
  decision: approvalDecision, // 'approved' | 'rejected'
  comment: z.string().trim().max(500).optional().or(z.literal("")),
});
export type RecordApprovalInput = z.infer<typeof recordApprovalSchema>;

export const disburseLoanSchema = z.object({
  loanId: z.string().uuid(),
  outstandingBalance: z.coerce.number().nonnegative().optional(),
});
export type DisburseLoanInput = z.infer<typeof disburseLoanSchema>;

import { z } from "zod";
import { contributionMethod } from "@/lib/validation/enums";
import { fileRef } from "@/lib/validation/file";

/**
 * A member may record these contribution pools themselves. `registration` and
 * `admin_levy` are created by the system/officers, not chosen here (fund separation,
 * CLAUDE.md §3.5). Every amount is validated `> 0`.
 */
export const memberContributionType = z.enum(["savings", "welfare", "investment"]);

export const recordContributionSchema = z.object({
  type: memberContributionType,
  amount: z.coerce
    .number({ invalid_type_error: "Enter an amount." })
    .positive("Amount must be greater than zero.")
    .max(1_000_000_000, "That amount looks too large."),
  period: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, "Use the format YYYY-MM.")
    .optional()
    .or(z.literal("")),
  method: contributionMethod,
  paymentReference: z.string().trim().max(120).optional().or(z.literal("")),
  receiptUrl: fileRef.optional().or(z.literal("")),
});

export type RecordContributionInput = z.infer<typeof recordContributionSchema>;

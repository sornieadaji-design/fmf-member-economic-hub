import { z } from "zod";
import { welfareCategory } from "@/lib/validation/enums";
import { fileRef } from "@/lib/validation/file";

/** Investment subscription — a member must acknowledge risk to subscribe (build spec §6.5). */
export const subscribeSchema = z.object({
  opportunityId: z.string().uuid(),
  amount: z.coerce
    .number({ invalid_type_error: "Enter an amount." })
    .positive("Amount must be greater than zero.")
    .max(1_000_000_000, "That amount looks too large."),
  riskAcknowledged: z.literal(true, {
    errorMap: () => ({ message: "You must acknowledge the risk to subscribe." }),
  }),
});
export type SubscribeInput = z.infer<typeof subscribeSchema>;

/** Welfare claim (build spec §6.6). */
export const welfareClaimSchema = z.object({
  category: welfareCategory,
  amountRequested: z.coerce
    .number({ invalid_type_error: "Enter an amount." })
    .positive("Amount must be greater than zero.")
    .max(1_000_000_000, "That amount looks too large."),
  reason: z.string().trim().min(5, "Briefly explain the request.").max(1000),
  evidenceUrl: fileRef.optional().or(z.literal("")),
});
export type WelfareClaimInput = z.infer<typeof welfareClaimSchema>;

/** A single vote on a resolution (build spec §6.7). Choice must be one of the options. */
export const castVoteSchema = z.object({
  resolutionId: z.string().uuid(),
  choice: z.string().trim().min(1, "Choose an option."),
});
export type CastVoteInput = z.infer<typeof castVoteSchema>;

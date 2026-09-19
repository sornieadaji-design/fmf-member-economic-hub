import { z } from "zod";
import {
  staffRole,
  userRole,
  assetClass,
  riskLevel,
  announcementCategory,
  announcementAudience,
} from "@/lib/validation/enums";

export const setRoleSchema = z.object({
  userId: z.string().uuid(),
  role: userRole,
  staffRole: staffRole,
});
export type SetRoleInput = z.infer<typeof setRoleSchema>;

export const createOpportunitySchema = z.object({
  title: z.string().trim().min(3, "Enter a title.").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  assetClass: assetClass,
  riskLevel: riskLevel,
  minSubscription: z.coerce.number().nonnegative().optional(),
  disclosureUrl: z.string().url().optional().or(z.literal("")),
});
export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3, "Enter a title.").max(200),
  body: z.string().trim().max(5000).optional().or(z.literal("")),
  category: announcementCategory,
  audience: announcementAudience,
  isPolicy: z.boolean().optional(),
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const createResolutionSchema = z.object({
  title: z.string().trim().min(3, "Enter a title.").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  options: z.array(z.string().trim().min(1)).min(2, "Provide at least two options."),
});
export type CreateResolutionInput = z.infer<typeof createResolutionSchema>;

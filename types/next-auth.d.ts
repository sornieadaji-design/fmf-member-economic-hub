import type { DefaultSession } from "next-auth";
import type { StaffRoleValue, UserRoleValue } from "@/lib/auth/roles";

/**
 * Augment the Auth.js Session so guards and UI can read the member's role,
 * office and onboarding status directly off the session.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRoleValue;
      staffRole: StaffRoleValue;
      onboardingStatus: string;
      fmfMemberId: string | null;
    } & DefaultSession["user"];
  }
}

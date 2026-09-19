import { redirect } from "next/navigation";
import { auth } from "./index";
import { OFFICE_GROUPS, type OfficeGroup, type StaffRoleValue } from "./roles";

/**
 * Central authorization. NEVER inline an ownership or role check in a component or
 * action — call one of these. They are the primary access control (CLAUDE.md §4).
 *
 * Every guard throws AuthorizationError on failure; server actions let it bubble
 * (Next renders the nearest error boundary) or catch it to return a typed result.
 * Middleware handles the coarse redirect; these are the last line of defence and
 * MUST be called inside every server action / server component that touches data.
 */

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UNAUTHENTICATED"
      | "ONBOARDING_INCOMPLETE"
      | "NOT_OFFICER"
      | "WRONG_OFFICE"
      | "NOT_OWNER" = "UNAUTHENTICATED",
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export interface ActingUser {
  id: string;
  role: "admin" | "member";
  staffRole: StaffRoleValue;
  onboardingStatus: string;
  fmfMemberId: string | null;
  email?: string | null;
}

/** Signed in — but not necessarily onboarded. Rarely used directly; prefer requireMember. */
export async function requireSignedIn(): Promise<ActingUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthorizationError("You must be signed in.", "UNAUTHENTICATED");
  }
  return {
    id: session.user.id,
    role: session.user.role,
    staffRole: session.user.staffRole,
    onboardingStatus: session.user.onboardingStatus,
    fmfMemberId: session.user.fmfMemberId ?? null,
    email: session.user.email,
  };
}

/** Signed in AND onboarding complete. The gate for all transactional member screens. */
export async function requireMember(): Promise<ActingUser> {
  const user = await requireSignedIn();
  if (user.onboardingStatus !== "active") {
    throw new AuthorizationError(
      "Complete onboarding before you can transact.",
      "ONBOARDING_INCOMPLETE",
    );
  }
  return user;
}

/**
 * Officer gate. `role === 'admin'` is the coarse requirement. Optionally require a
 * specific office group (e.g. "confirmContributions") for finer control.
 */
export async function requireOfficer(office?: OfficeGroup): Promise<ActingUser> {
  const user = await requireSignedIn();
  if (user.role !== "admin") {
    throw new AuthorizationError("Officers only.", "NOT_OFFICER");
  }
  if (office) {
    const allowed = OFFICE_GROUPS[office] as readonly StaffRoleValue[];
    if (!allowed.includes(user.staffRole)) {
      throw new AuthorizationError(
        `This action requires one of: ${allowed.join(", ")}.`,
        "WRONG_OFFICE",
      );
    }
  }
  return user;
}

/**
 * The acting user must own `memberId`, OR be an officer. Use for any read/write of a
 * member-owned record. Ownership is checked against the SESSION user id — never a
 * member id passed from the client.
 */
export async function requireSelfOrOfficer(memberId: string): Promise<ActingUser> {
  const user = await requireSignedIn();
  if (user.id === memberId) return user;
  if (user.role === "admin") return user;
  throw new AuthorizationError(
    "You can only access your own records.",
    "NOT_OWNER",
  );
}

/**
 * Page-level gate for member route components: like requireMember, but REDIRECTS instead
 * of throwing, so a not-yet-onboarded (or signed-out) visitor lands on the wizard/sign-in
 * cleanly rather than hitting an error boundary. Server actions keep requireMember (throw).
 */
export async function requireActiveMemberPage(): Promise<ActingUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");
  if (session.user.onboardingStatus !== "active") redirect("/onboarding");
  return {
    id: session.user.id,
    role: session.user.role,
    staffRole: session.user.staffRole,
    onboardingStatus: session.user.onboardingStatus,
    fmfMemberId: session.user.fmfMemberId ?? null,
    email: session.user.email,
  };
}

/** Non-throwing helper for conditional UI (e.g. show an admin link). */
export async function isOfficer(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === "admin";
}

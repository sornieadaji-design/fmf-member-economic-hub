import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guardrail tests for the authorization layer (CLAUDE.md §7).
 *
 * We mock the Auth.js `auth()` session so the guards can be tested without a live
 * session. These cover the coarse gates; the data-ownership and dual-approval
 * guardrails get their own integration tests against a test database as those
 * features land (Phases 5–8). Treat this file as the pattern to extend, not the
 * finished suite.
 */

// Mock the session source that guards.ts depends on.
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

// Import AFTER the mock is registered.
const {
  requireMember,
  requireOfficer,
  requireSelfOrOfficer,
  AuthorizationError,
} = await import("@/lib/auth/guards");

function session(over: Record<string, unknown> = {}) {
  return {
    user: {
      id: "user-1",
      email: "m@demo.fmf",
      role: "member",
      staffRole: "member",
      onboardingStatus: "active",
      ...over,
    },
  };
}

beforeEach(() => mockAuth.mockReset());

describe("requireMember", () => {
  it("rejects a signed-out visitor", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requireMember()).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("rejects a member who has not finished onboarding", async () => {
    mockAuth.mockResolvedValue(session({ onboardingStatus: "registered" }));
    await expect(requireMember()).rejects.toMatchObject({
      code: "ONBOARDING_INCOMPLETE",
    });
  });

  it("allows an onboarded member", async () => {
    mockAuth.mockResolvedValue(session());
    await expect(requireMember()).resolves.toMatchObject({ id: "user-1" });
  });
});

describe("requireOfficer", () => {
  it("blocks an ordinary member from officer-only actions", async () => {
    mockAuth.mockResolvedValue(session());
    await expect(requireOfficer()).rejects.toMatchObject({ code: "NOT_OFFICER" });
  });

  it("allows an admin officer", async () => {
    mockAuth.mockResolvedValue(session({ role: "admin", staffRole: "treasurer" }));
    await expect(requireOfficer()).resolves.toMatchObject({ role: "admin" });
  });

  it("enforces the office group for finer checks", async () => {
    mockAuth.mockResolvedValue(session({ role: "admin", staffRole: "welfare_officer" }));
    // welfare_officer is not in confirmContributions -> rejected
    await expect(requireOfficer("confirmContributions")).rejects.toMatchObject({
      code: "WRONG_OFFICE",
    });
  });
});

describe("requireSelfOrOfficer", () => {
  it("lets a member reach their own record", async () => {
    mockAuth.mockResolvedValue(session());
    await expect(requireSelfOrOfficer("user-1")).resolves.toMatchObject({ id: "user-1" });
  });

  it("blocks a member from another member's record", async () => {
    mockAuth.mockResolvedValue(session());
    await expect(requireSelfOrOfficer("user-2")).rejects.toMatchObject({
      code: "NOT_OWNER",
    });
  });

  it("lets an officer reach any member's record", async () => {
    mockAuth.mockResolvedValue(session({ role: "admin" }));
    await expect(requireSelfOrOfficer("user-2")).resolves.toMatchObject({ role: "admin" });
  });
});

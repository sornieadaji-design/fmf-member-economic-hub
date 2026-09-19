import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Phase 4 guardrail (build spec §7.1): a signed-in member whose onboarding is not
 * 'active' is confined to the wizard — the (member) layout redirects them to /onboarding
 * and they cannot reach /dashboard or any transactional route. This is the authoritative
 * Node-runtime gate (middleware only does a coarse redirect).
 */

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirectMock(u) }));

const { default: MemberLayout } = await import("@/app/(member)/layout");

function session(over: Record<string, unknown> = {}) {
  return {
    user: {
      id: "u1",
      email: "m@demo.fmf",
      role: "member",
      staffRole: "member",
      onboardingStatus: "active",
      ...over,
    },
  };
}

beforeEach(() => {
  mockAuth.mockReset();
  redirectMock.mockClear();
});

describe("(member) route-group gate", () => {
  it("redirects a member who has not finished onboarding to /onboarding", async () => {
    mockAuth.mockResolvedValue(session({ onboardingStatus: "registered" }));
    await expect(MemberLayout({ children: "x" })).rejects.toThrow("REDIRECT:/onboarding");
    expect(redirectMock).toHaveBeenCalledWith("/onboarding");
  });

  it("redirects a member stuck mid-wizard (tier_selected) to /onboarding", async () => {
    mockAuth.mockResolvedValue(session({ onboardingStatus: "tier_selected" }));
    await expect(MemberLayout({ children: "x" })).rejects.toThrow("REDIRECT:/onboarding");
  });

  it("lets an active member through without redirecting", async () => {
    mockAuth.mockResolvedValue(session());
    const out = await MemberLayout({ children: "child" });
    expect(out).toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("blocks a signed-out visitor before any render", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(MemberLayout({ children: "x" })).rejects.toBeTruthy();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Phase-2 KYC confidentiality (CLAUDE.md §3.7, §9): the /api/files route serves an
 * uploaded file only to its owner or an officer. Ownership is encoded in the path
 * (<kind>/<ownerUserId>/<file>) and checked with requireSelfOrOfficer. No DB needed.
 */

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

const { GET } = await import("@/app/api/files/[...path]/route");

function session(id: string, role: "admin" | "member" = "member") {
  return { user: { id, email: "x@itest.fmf", role, staffRole: "member", onboardingStatus: "active", fmfMemberId: null } };
}
function call(path: string[]) {
  return GET({} as never, { params: Promise.resolve({ path }) });
}

beforeEach(() => {
  mockAuth.mockReset();
  process.env.BLOB_STORE_ID = "store_TESTSTORE";
  vi.stubGlobal("fetch", vi.fn(async () => new Response("filedata", { headers: { "content-type": "image/png" } })));
});
afterEach(() => vi.unstubAllGlobals());

describe("/api/files ownership guard", () => {
  it("blocks a member fetching another member's file (403)", async () => {
    mockAuth.mockResolvedValue(session("u1"));
    const res = await call(["kyc", "u2", "doc.png"]);
    expect(res.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lets a member fetch their OWN file", async () => {
    mockAuth.mockResolvedValue(session("u1"));
    const res = await call(["kyc", "u1", "doc.png"]);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
  });

  it("lets an officer fetch any member's file", async () => {
    mockAuth.mockResolvedValue(session("officer", "admin"));
    const res = await call(["kyc", "u2", "doc.png"]);
    expect(res.status).toBe(200);
  });

  it("404s a malformed path", async () => {
    mockAuth.mockResolvedValue(session("u1"));
    const res = await call(["kyc"]);
    expect(res.status).toBe(404);
  });

  it("blocks an unauthenticated visitor", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(call(["kyc", "u1", "doc.png"])).rejects.toBeTruthy();
  });
});

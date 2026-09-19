"use server";

import { revalidatePath } from "next/cache";
import { requireOfficer } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { notifyMember } from "@/lib/email";
import { setRoleSchema, type SetRoleInput } from "@/lib/validation/admin";

/**
 * Members administration (build spec §6.8). Officers verify KYC and set offices/roles.
 * Both are sensitive and write an audit row. Granting admin needs the manageRoles office.
 */

export interface MemberRow {
  user_id: string;
  name: string | null;
  email: string;
  fmf_member_id: string | null;
  participation_option: string;
  tier: string;
  kyc_status: string;
  onboarding_status: string;
  role: string;
  staff_role: string;
  status: string;
}

export async function listMembers(): Promise<MemberRow[]> {
  await requireOfficer();
  return db
    .selectFrom("member_profiles as p")
    .innerJoin("users as u", "u.id", "p.user_id")
    .select([
      "p.user_id as user_id",
      "u.name as name",
      "u.email as email",
      "p.fmf_member_id as fmf_member_id",
      "p.participation_option as participation_option",
      "p.tier as tier",
      "p.kyc_status as kyc_status",
      "p.onboarding_status as onboarding_status",
      "p.role as role",
      "p.staff_role as staff_role",
      "p.status as status",
    ])
    .orderBy("p.fmf_member_id", "asc")
    .execute();
}

export type MemberActionResult = { ok: true } | { ok: false; error: string };

export async function verifyKyc(userId: string): Promise<MemberActionResult> {
  const officer = await requireOfficer("verifyKyc");
  await db.transaction().execute(async (tx) => {
    await tx.updateTable("member_profiles").set({ kyc_status: "verified" }).where("user_id", "=", userId).execute();
    await writeAudit(tx, {
      actorId: officer.id,
      action: "kyc.verify",
      entity: "member_profiles",
      entityId: userId,
    });
    revalidatePath("/admin/members");
    return { ok: true };
  });
  await notifyMember(userId, "Your FMF identity verification is complete", "An officer has verified your KYC documents. Thank you.");
  return { ok: true };
}

export async function rejectKyc(userId: string): Promise<MemberActionResult> {
  const officer = await requireOfficer("verifyKyc");
  return db.transaction().execute<MemberActionResult>(async (tx) => {
    await tx.updateTable("member_profiles").set({ kyc_status: "rejected" }).where("user_id", "=", userId).execute();
    await writeAudit(tx, { actorId: officer.id, action: "kyc.reject", entity: "member_profiles", entityId: userId });
    revalidatePath("/admin/members");
    return { ok: true };
  });
}

/** Set a member's role + office. Granting/removing admin is the most sensitive action. */
export async function setMemberRole(input: SetRoleInput): Promise<MemberActionResult> {
  const officer = await requireOfficer("manageRoles");
  const parsed = setRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { userId, role, staffRole } = parsed.data;

  return db.transaction().execute<MemberActionResult>(async (tx) => {
    await tx.updateTable("member_profiles").set({ role, staff_role: staffRole }).where("user_id", "=", userId).execute();
    await writeAudit(tx, {
      actorId: officer.id,
      action: "role.change",
      entity: "member_profiles",
      entityId: userId,
      details: { role, staff_role: staffRole },
    });
    revalidatePath("/admin/members");
    return { ok: true };
  });
}

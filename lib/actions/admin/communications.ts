"use server";

import { revalidatePath } from "next/cache";
import { requireOfficer } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import {
  createAnnouncementSchema,
  createResolutionSchema,
  type CreateAnnouncementInput,
  type CreateResolutionInput,
} from "@/lib/validation/admin";

/** Communications (build spec §6.8): announcements, policies and resolutions. */

export type CommsResult = { ok: true } | { ok: false; error: string };

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<CommsResult> {
  const officer = await requireOfficer("postCommunications");
  const parsed = createAnnouncementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const d = parsed.data;

  await db
    .insertInto("announcements")
    .values({
      title: d.title,
      body: d.body || null,
      category: d.category,
      audience: d.audience,
      is_policy: d.isPolicy ?? false,
      created_by: officer.id,
    })
    .execute();

  revalidatePath("/admin/communications");
  revalidatePath("/notices");
  return { ok: true };
}

export async function createResolution(input: CreateResolutionInput): Promise<CommsResult> {
  const officer = await requireOfficer("postCommunications");
  const parsed = createResolutionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const d = parsed.data;

  return db.transaction().execute<CommsResult>(async (tx) => {
    const r = await tx
      .insertInto("resolutions")
      .values({ title: d.title, description: d.description || null, options: d.options, status: "open", created_by: officer.id })
      .returning("id")
      .executeTakeFirstOrThrow();
    await writeAudit(tx, { actorId: officer.id, action: "resolution.open", entity: "resolutions", entityId: r.id });
    revalidatePath("/admin/communications");
    revalidatePath("/notices");
    return { ok: true };
  });
}

export async function setResolutionStatus(id: string, status: "open" | "closed"): Promise<CommsResult> {
  const officer = await requireOfficer("postCommunications");
  return db.transaction().execute<CommsResult>(async (tx) => {
    await tx.updateTable("resolutions").set({ status }).where("id", "=", id).execute();
    await writeAudit(tx, { actorId: officer.id, action: `resolution.${status === "open" ? "open" : "close"}`, entity: "resolutions", entityId: id });
    revalidatePath("/admin/communications");
    revalidatePath("/notices");
    return { ok: true };
  });
}

export interface AdminResolutionRow {
  id: string;
  title: string;
  status: string;
  options: string[];
  votes: number;
}

export async function listResolutionsAdmin(): Promise<AdminResolutionRow[]> {
  await requireOfficer();
  const rows = await db
    .selectFrom("resolutions")
    .select(["id", "title", "status", "options"])
    .orderBy("created_at", "desc")
    .execute();
  return Promise.all(
    rows.map(async (r) => {
      const c = await db
        .selectFrom("votes")
        .select((eb) => eb.fn.count<string>("id").as("n"))
        .where("resolution_id", "=", r.id)
        .executeTakeFirst();
      return { id: r.id, title: r.title, status: r.status, options: (r.options as string[]) ?? [], votes: Number(c?.n ?? 0) };
    }),
  );
}

"use server";

import { revalidatePath } from "next/cache";
import type { Selectable } from "kysely";
import { requireMember } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import type { Database } from "@/lib/db/types";
import { castVoteSchema, type CastVoteInput } from "@/lib/validation/governance";

/**
 * Notices, documents & voting (build spec §6.7). Announcements are filtered by audience
 * and the member's participation/role; resolutions accept exactly one vote per member
 * (DB unique constraint UNIQUE(resolution_id, member_id) — enforced, not just UI).
 */

const PG_UNIQUE_VIOLATION = "23505";
function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === PG_UNIQUE_VIOLATION;
}

export type AnnouncementRow = Pick<
  Selectable<Database["announcements"]>,
  "id" | "title" | "body" | "category" | "file_url" | "is_policy" | "audience" | "created_at"
>;

export async function listAnnouncementsForMe(): Promise<AnnouncementRow[]> {
  const user = await requireMember();
  const profile = await db
    .selectFrom("member_profiles")
    .select(["participation_option"])
    .where("user_id", "=", user.id)
    .executeTakeFirst();

  const allowed: ("all" | "cooperative" | "investment" | "officers")[] = ["all"];
  const p = profile?.participation_option;
  if (p === "cooperative" || p === "both") allowed.push("cooperative");
  if (p === "investment" || p === "both") allowed.push("investment");
  if (user.role === "admin") allowed.push("officers");

  return db
    .selectFrom("announcements")
    .select(["id", "title", "body", "category", "file_url", "is_policy", "audience", "created_at"])
    .where("audience", "in", allowed)
    .orderBy("created_at", "desc")
    .execute();
}

export interface ResolutionForMe {
  id: string;
  title: string;
  description: string | null;
  options: string[];
  status: string;
  closes_on: Date | null;
  myChoice: string | null;
}

export async function listResolutionsForMe(): Promise<ResolutionForMe[]> {
  const user = await requireMember();
  const rows = await db
    .selectFrom("resolutions as r")
    .leftJoin("votes as v", (join) =>
      join.onRef("v.resolution_id", "=", "r.id").on("v.member_id", "=", user.id),
    )
    .select([
      "r.id as id",
      "r.title as title",
      "r.description as description",
      "r.options as options",
      "r.status as status",
      "r.closes_on as closes_on",
      "v.choice as myChoice",
    ])
    .where("r.status", "in", ["open", "closed"])
    .orderBy("r.created_at", "desc")
    .execute();

  return rows.map((r) => ({
    ...r,
    options: (r.options as string[]) ?? [],
  }));
}

export type VoteResult = { ok: true } | { ok: false; error: string };

export async function castVote(input: CastVoteInput): Promise<VoteResult> {
  const user = await requireMember();
  const parsed = castVoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { resolutionId, choice } = parsed.data;

  const resolution = await db
    .selectFrom("resolutions")
    .select(["id", "status", "options"])
    .where("id", "=", resolutionId)
    .executeTakeFirst();
  if (!resolution) return { ok: false, error: "Resolution not found." };
  if (resolution.status !== "open") return { ok: false, error: "This resolution is not open for voting." };
  const options = (resolution.options as string[]) ?? [];
  if (!options.includes(choice)) return { ok: false, error: "That is not a valid option." };

  try {
    await db
      .insertInto("votes")
      .values({ resolution_id: resolutionId, member_id: user.id, choice })
      .execute();
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, error: "You have already voted on this resolution." };
    }
    return { ok: false, error: "Could not record your vote." };
  }

  revalidatePath("/notices");
  return { ok: true };
}

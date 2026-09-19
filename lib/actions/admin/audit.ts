"use server";

import { requireOfficer } from "@/lib/auth/guards";
import { db } from "@/lib/db";

/**
 * Read-only audit log (build spec §6.8, §7.5). There is deliberately NO update/delete
 * action here or anywhere — audit_logs is append-only at the database (trigger + revoked
 * privileges). Reading requires the readAudit office.
 */
export interface AuditRow {
  id: string;
  actor_name: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  created_at: Date;
}

export async function listAuditLog(limit = 200): Promise<AuditRow[]> {
  await requireOfficer("readAudit");
  return db
    .selectFrom("audit_logs as a")
    .leftJoin("users as u", "u.id", "a.actor_id")
    .select(["a.id as id", "u.name as actor_name", "a.action as action", "a.entity as entity", "a.entity_id as entity_id", "a.created_at as created_at"])
    .orderBy("a.created_at", "desc")
    .limit(limit)
    .execute();
}

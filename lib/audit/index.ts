import type { Kysely, Transaction } from "kysely";
import type { Database } from "@/lib/db/types";

export interface AuditInput {
  actorId: string;
  action: string; // e.g. "contribution.confirm", "loan.approve", "subscription.allocate"
  entity?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

/**
 * Append a row to the immutable audit log.
 *
 * ALWAYS call this INSIDE the same transaction as the action it records, so the
 * money change and its audit row commit together or not at all (CLAUDE.md §3, build spec §7).
 *
 *   await db.transaction().execute(async (tx) => {
 *     await tx.updateTable("contributions").set({ status: "confirmed", ... }).where(...).execute();
 *     await writeAudit(tx, { actorId, action: "contribution.confirm", entity: "contributions", entityId: id });
 *   });
 *
 * audit_logs is append-only at the DB (revoked privileges + trigger); there is no
 * update/delete helper here on purpose.
 */
export async function writeAudit(
  executor: Kysely<Database> | Transaction<Database>,
  input: AuditInput,
): Promise<void> {
  await executor
    .insertInto("audit_logs")
    .values({
      actor_id: input.actorId,
      action: input.action,
      entity: input.entity ?? null,
      entity_id: input.entityId ?? null,
      details: input.details ?? {},
    })
    .execute();
}

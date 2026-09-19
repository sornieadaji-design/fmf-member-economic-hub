import { Kysely, sql } from "kysely";

/**
 * A dedicated sequence for FMF Member IDs (build spec §6.1 step 9).
 *
 * fmf_member_id is generated at onboarding finish as `FMF-` + a zero-padded number.
 * Using a Postgres SEQUENCE (rather than count(*)+1) makes allocation concurrency-safe:
 * two members finishing at the same instant can never receive the same number.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE SEQUENCE IF NOT EXISTS fmf_member_seq START 1`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP SEQUENCE IF EXISTS fmf_member_seq`.execute(db);
}

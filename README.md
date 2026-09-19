# FMF Member Economic Hub

Members-only web app for the **FMF Coop & Investment Club** — savings, welfare, credit and opt-in
collective investment, with every financial action recorded, approved and auditable.

This repository is a **Phase 1–3 scaffold** produced from the Base44 spec re-platforming. It sets up
the project, the full database schema, and the auth + authorization layer, so Claude Code can begin
at **Phase 4 (onboarding)**. The governance model — dual-control, immutable audit, fund separation,
no guaranteed returns — is built into the schema and guards, not bolted on later.

## Read these first

- **`CLAUDE.md`** — project instructions Claude Code reads every session (stack, guardrails, DoD).
- **`FMF_ClaudeCode_Build_Spec.md`** — the full build spec (data model, routes, workflows, phases).
- **`FMF_ClaudeCode_Prompt.md`** — the kickoff prompt + phase prompts to drive the build.

## What's already here

| Area | Status |
|---|---|
| Next.js 15 + TypeScript (strict) + Tailwind config | ✅ scaffolded |
| Kysely + Postgres, typed `Database` (`lib/db`) | ✅ |
| **All 12 tables + settings**, enums, FKs, constraints (`migrations/`) | ✅ |
| DB-enforced dual-control (`UNIQUE(target,target_id,approver_id)`) | ✅ migration 010 |
| DB-enforced one-vote-per-resolution | ✅ migration 009 |
| Append-only `audit_logs` (trigger + optional REVOKE) | ✅ migration 011 |
| NextAuth v5 (Google) + `member_profiles` session (`lib/auth`) | ✅ stub — verify against Auth.js docs |
| Authorization guards (`lib/auth/guards.ts`) + middleware | ✅ |
| `writeAudit` helper (`lib/audit`) | ✅ |
| Zod enums + format helpers (₦, dd-mm-yyyy) | ✅ |
| Migration runner + demo seed (incl. the ₦80,000 dual-approval loan) | ✅ |
| Guardrail tests for the guards (`tests/guards.test.ts`) | ✅ pattern to extend |
| Onboarding wizard, dashboard, admin console, all member screens | ⬜ Phase 4+ (placeholders only) |

## Setup

```bash
pnpm install
cp .env.example .env          # fill in DATABASE_URL, AUTH_SECRET, Google OAuth, Blob token
pnpm db:migrate               # create the schema
pnpm db:seed                  # optional: demo data for local dev / the pilot pass
pnpm typecheck && pnpm test   # guards tests should pass
pnpm dev                      # http://localhost:3000
```

You need a Postgres database (local, Neon, or Vercel Postgres) and a Google OAuth client
(Authorized redirect URI `http://localhost:3000/api/auth/callback/google` for local dev).

## Known "verify-before-relying" points

Flagged honestly (see build spec §14). NextAuth.js v5 (Auth.js) is still on a beta tag and its
adapter/callback API has shifted between betas — confirm `lib/auth/index.ts`, `middleware.ts`, and
the `@auth/pg-adapter` table schema (`migrations/002`) against the current docs at authjs.dev before
go-live. Package versions in `package.json` are plausible-recent but not install-verified in this
scaffold; let the lockfile resolve compatible versions.

## Before launch

Do not handle real member money or KYC data until the pre-publish checklist (build spec §12) and the
legal gates (§14: cooperative registration, NDPA/NDPC, the SEC question on the Investment Club) are
cleared, and every guardrail test in `CLAUDE.md` §7 passes. **Delete all demo/seed data first.**

*FMF Coop & Investment Club — September 2026.*

# FMF Member Economic Hub — Claude Code Prompt

**How to use this.** Put `CLAUDE.md` and `FMF_ClaudeCode_Build_Spec.md` in the repo root of an empty
project folder. Open Claude Code there and paste **Prompt 0** below to begin. Then work through the
phase prompts one at a time — paste the next only after the previous phase's checks pass. The phase
prompts are deliberately short because the detail lives in the two companion files; Claude Code reads
them.

---

## Prompt 0 — Master kickoff (paste first)

```
You are building the FMF Member Economic Hub, a members-only web app for the FMF Coop & Investment
Club — a Nigerian cooperative and investment society of ~230 members. This is a re-platforming of a
Base44 no-code spec into an owned codebase.

Read CLAUDE.md and FMF_ClaudeCode_Build_Spec.md in the repo root before writing any code. They are
the source of truth: CLAUDE.md holds the stack, conventions and non-negotiable guardrails; the build
spec holds the data model, routes, workflows and phased build order. Follow them exactly. If anything
in them is ambiguous or looks wrong, stop and ask me rather than guessing.

Hard rules you must never break (from CLAUDE.md §3):
1. A member reads/writes only their own records; officers get wider access via role = 'admin'.
2. Loans, investment allocations and large welfare payouts need TWO approvals from TWO DISTINCT
   officers — enforced by a UNIQUE(target_entity, target_id, approver_id) constraint, not just UI.
3. Members never confirm their own payments.
4. audit_logs is append-only: no UPDATE, no DELETE, for anyone — enforced at the database.
5. Savings, welfare, investment, registration and levy are separate pools; never render a merged
   balance.
6. No screen ever displays, implies or projects a guaranteed investment return.
7. KYC documents and officer-only fields are never exposed to other members.
8. Every mutation touching money, approvals, KYC, roles or resolutions writes an audit_logs row
   INSIDE the same database transaction.

Stack (fixed): Next.js 15 (App Router, Server Actions), TypeScript strict, PostgreSQL + Kysely,
NextAuth.js v5 (Google), shadcn/ui + Tailwind, Zod, Vercel Blob, hosted on Vercel. Mobile-first.
Currency NGN (₦); dates dd-mm-yyyy. Do not substitute an ORM or a different auth/DB.

Way of working:
- Build in the phase order in the build spec §11. Do one phase, run typecheck + tests, show me the
  result, and wait for my go-ahead before the next phase.
- Schema and auth guards come before any screen. Never trust member_id from the client — derive it
  from the session. Validate every input with Zod. Run financial mutations in a single transaction.
- For every feature, add the guardrail test named in CLAUDE.md §7. A feature is not done until its
  guardrail test passes.
- Where you are unsure of current framework syntax (NextAuth v5 config, Kysely migrations, Postgres
  RLS), say so and verify against current docs rather than inventing an API.

Start with Phase 1 (Scaffold) only: set up the Next.js 15 + TypeScript project with Tailwind and
shadcn/ui, Kysely with a migration runner, ESLint and a test runner, and the package.json scripts
listed in CLAUDE.md §7 (dev, build, typecheck, lint, test, db:migrate, db:seed). Add formatNGN() and
formatDate() helpers. Do NOT create schema or screens yet. When the project builds and `pnpm
typecheck` passes, stop and show me the file tree and the scripts, and wait.
```

---

## Phase prompts (paste one at a time, after each phase's checks pass)

### Phase 2 — Schema
```
Proceed to Phase 2 (Schema) from the build spec §4 and §11. Write Kysely migrations for all twelve
entities: member_profiles, contributions, loans, loan_repayments, investment_opportunities,
investment_subscriptions, welfare_claims, announcements, resolutions, votes, approvals, audit_logs.
Use uuid primary keys, created_at/created_by columns, Postgres enum types (or text + CHECK) matching
the spec's enums, and real foreign keys.

Enforce these at the database, not in app code:
- UNIQUE(resolution_id, member_id) on votes (one vote per member per resolution).
- UNIQUE(target_entity, target_id, approver_id) on approvals (two approved rows = two distinct
  officers).
- audit_logs append-only: REVOKE UPDATE, DELETE on it from the app DB role, plus a BEFORE UPDATE OR
  DELETE trigger that raises an exception.

Generate the Kysely types and write a seed script (one test officer, one test member, a seeded
₦80,000 loan for the dual-approval test, plus a few sample records clearly marked as demo data).
Run the migrations and typecheck, then show me the schema and wait.
```

### Phase 3 — Auth & guards
```
Proceed to Phase 3. Configure NextAuth.js v5 with Google as the primary provider and a Postgres
adapter. On first sign-in, create the member_profiles row (role='member', staff_role='member',
onboarding_status='registered'). Attach role and staff_role to the session.

Implement lib/auth/guards.ts exactly per CLAUDE.md §4: requireMember(), requireOfficer(),
requireOfficer(<office>), requireSelfOrOfficer(memberId). Add middleware.ts protecting /admin/* (
officers) and the (member) route group (signed-in + onboarding_status='active'); each server action
must still re-check with a guard.

Add these guardrail tests and make them pass: a member cannot reach /admin/*; a member cannot call an
officer-only action; requireSelfOrOfficer blocks a member reading another member's id. Show results
and wait.
```

### Phase 4 — Onboarding
```
Proceed to Phase 4. Build the 11-step onboarding wizard at /onboarding per build spec §6.1:
mobile-first, one step per screen, progress bar, resumable, persisting onboarding_status at each
step. Include KYC upload to Vercel Blob (kyc_status='submitted'), consent capture, tier selection,
an initial contribution recorded as contributions(type='registration', status='pending') with
reference + receipt (no in-app payment), fmf_member_id generation on finish, and
onboarding_status='active' at the end.

Guardrail test: a member with onboarding_status <> 'active' is redirected to the wizard and cannot
reach /dashboard or any transactional route. Show results and wait.
```

### Phase 5 — Dashboard & Contributions
```
Proceed to Phase 5. Build the member dashboard (/dashboard, §6.2) and Contributions screen
(/contributions, §6.3). Dashboard cards show, per this member only: total confirmed savings, welfare
contributions, current loan balance, investment subscriptions total — each pool computed
separately. Contributions screen lets a member record a pending contribution and download a
statement of confirmed ones.

Guardrail tests: a member cannot read another member's contributions; no view returns a single merged
cross-pool balance. Show results and wait.
```

### Phase 6 — Loans & dual-approval
```
Proceed to Phase 6. Build the Loans screen (/loans, §6.4) and the loan dual-approval workflow (§7.3)
in the admin loan book. In one transaction on an officer approval: insert an approvals row (the
UNIQUE constraint makes a repeat by the same officer fail — surface "you have already approved this;
a different officer is required"), recompute approval_count from distinct approved rows, and allow
status='approved' only at 2. Only after approved can an officer mark disbursed and set
outstanding_balance. Every approval/status change writes an audit_logs row in the same transaction.

Guardrail tests: a loan cannot reach approved on one officer's approval; the same officer approving
twice does not advance it; two distinct officers do; members cannot record approvals. Show results
and wait.
```

### Phase 7 — Investment room, Welfare, Notices/Voting
```
Proceed to Phase 7. Build /investments (§6.5, visible only to participation investment|both; every
card shows "Investments carry risk. Returns are not guaranteed."; subscribing requires a risk
checkbox; never show projected/guaranteed returns), /welfare (§6.6), and /notices (§6.7:
announcements filtered by audience; open resolutions with one vote per member enforced by the DB
constraint; closed resolutions read-only).

Guardrail tests: a cooperative-only member cannot see the investment room; a second vote on the same
resolution is refused; no investment view exposes a guaranteed/projected return. Show results and
wait.
```

### Phase 8 — Admin console
```
Proceed to Phase 8. Build the officers-only admin console (/admin/*, §6.8) as tabs: Members (verify
KYC, edit staff_role), Onboarding pipeline, Contributions (officer confirmation writing audit),
Loan book, Welfare, Investments (allocation via two approvals), Approvals queue, Communications
(announcements, policies, resolutions), Audit (read-only), Reports. Apply the same two-approval
pattern to investment allocation and to welfare payouts above the threshold (store thresholds in a
settings table, not hard-coded).

Guardrail tests: only officers reach any /admin route; contribution confirmation is officer-only and
writes an audit row; the audit tab exposes no edit/delete path; audit_logs rejects UPDATE and DELETE.
Show results and wait.
```

### Phase 9 — Integrations & reports
```
Proceed to Phase 9 (§8). Wire file uploads (Vercel Blob, access restricted to owner + officers),
transactional email for confirmations/status changes, and CSV export from the Reports tab (route
handler under /api) with each pool summed independently. Then run through every guardrail in build
spec §9 and confirm each has a passing test.

Show me the full test suite result and a short checklist of §9 guardrails with pass/fail, and wait.
```

### Phase 10 — Pilot & pre-publish
```
Proceed to Phase 10. Prepare for the pilot: confirm the pilot pass works end to end (post an
announcement; open a resolution and cast a vote; walk a test member through onboarding; confirm their
contribution and KYC; verify both appear in the audit log; run the dual-approval check on the seeded
₦80,000 loan). Then produce the pre-publish steps from build spec §12 as an actionable checklist for
me, including the seed-data removal script and the non-officer security-boundary check. Do NOT deploy
to production or remove seed data automatically — those are my decisions. Summarise what is ready and
what I must clear (including the §14 legal gates) before launch.
```

---

## One-shot alternative (if you prefer to hand over the whole build at once)

Paste Prompt 0, but replace its final paragraph ("Start with Phase 1 … and wait.") with:

```
Build the whole MVP in the phase order of build spec §11, but PAUSE after each phase to run typecheck
+ tests and give me a one-paragraph summary with the phase's guardrail-test results before
continuing. Never load real member data or deploy to production — stop at the end of Phase 10 with
the pre-publish checklist and the legal gates for me to clear. If you hit a decision that would
weaken any guardrail in CLAUDE.md §3, stop and ask.
```

Phased is safer for a money-handling app — you inspect the controls as they land. Use the one-shot
form only if you will review the diff and the tests carefully before any real use.

---

*Companion files: `CLAUDE.md` and `FMF_ClaudeCode_Build_Spec.md`. September 2026.*

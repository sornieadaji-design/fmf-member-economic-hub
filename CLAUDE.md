# CLAUDE.md — FMF Member Economic Hub

> Project instruction file for Claude Code. Read this first, and keep to it on every session.
> This app handles member money, credit and identity data for a Nigerian cooperative and
> investment society of ~230 members. Governance is not a feature — it is the point.

---

## 1. What we are building

A members-only web app, the **FMF Member Economic Hub**, for the **FMF Coop & Investment Club**
(the Forum of Makurdi Friends). One role-controlled system covers two separately-governed functions:

1. **Cooperative Society** — savings, welfare, credit (loans).
2. **Investment Club** — opt-in collective investment.

Members register, choose how they participate, save, apply for loans, request welfare, read
notices, and vote on resolutions. A small set of elected officers administer the society. **Every
financial action is recorded, approved and auditable.**

This is a re-platforming: the app was previously specified for Base44 (no-code). We are now building
it as a real, owned codebase with Claude Code. Nothing about the *governance model* changes — only
the implementation gains transactional integrity, foreign-key correctness, database-enforced audit,
and testable controls that a document store could only approximate.

---

## 2. Tech stack (fixed for this build)

> **Assumption (stated):** this adopts the same house stack used for ABI Treaty Watch. If a
> different stack is intended, stop and confirm before scaffolding.

- **Framework:** Next.js 15 (App Router, Server Components, Server Actions), TypeScript (strict).
- **Database:** PostgreSQL. **Query builder:** Kysely (typed; no ORM magic).
- **Migrations:** Kysely migrations (`migrations/` folder, forward-only, checked in).
- **Auth:** NextAuth.js v5 (Auth.js) with Google OAuth as the primary provider.
- **UI:** shadcn/ui + Tailwind CSS. **Mobile-first**, clean, trustworthy.
- **Validation:** Zod on every server action/route input. Forms: React Hook Form + Zod resolver.
- **File storage:** Vercel Blob (KYC documents, payment receipts, disclosure docs).
- **Hosting:** Vercel + Vercel Postgres (or Neon). **Currency:** NGN (₦). **Dates:** day-month-year.

Do not introduce ORMs (Prisma/Drizzle), alternative auth, or a different DB without explicit
approval. Prefer Server Actions over API routes for mutations; use route handlers only where an
external caller needs them (webhooks, CSV export).

---

## 3. Non-negotiable guardrails (enforce everywhere)

These are carried verbatim from the FMF Constitution & Policy Pack and the original build spec.
Treat them as invariants, not preferences. If a change would weaken one, stop and flag it.

1. **Ownership.** A member can read and write only their own records. Officers get wider access via
   `role = 'admin'`. Never leak one member's financial data to another.
2. **No unilateral authority.** Loans, investment allocations and welfare payouts above the policy
   threshold require **two approvals from two *distinct* officers**. One officer can never approve
   alone — enforced at the database level (unique constraint), not just in the UI.
3. **Members never confirm their own payments.** Contribution confirmation is officer-only.
4. **Immutable audit log.** `audit_logs` is **append-only**: no update, no delete, for anyone —
   enforced by revoked table privileges and/or a trigger, not only by app code.
5. **Fund separation.** Savings, welfare, investment, registration and levy are distinct pools.
   Reports sum each pool independently. **Never render a single merged balance.**
6. **No guaranteed returns.** Every investment screen shows risk and never displays, implies or
   projects a guaranteed return.
7. **KYC confidentiality.** Identity documents are readable only by the owning member and authorised
   officers. Officer-only fields (e.g. `decision_notes`) are never sent to a member's client.
8. **Least privilege.** `role = 'admin'` is granted only to actual officers. Everyone else is a member.
9. **No real funds move in-app (MVP).** Payments are recorded manually (reference + receipt upload)
   and confirmed by an officer. No payment gateway in the MVP.

Every mutation that touches money, approvals, KYC, roles or resolutions **must write an `audit_logs`
entry inside the same database transaction**.

---

## 4. Authorization model

Base44 had a built-in `role` (admin/user) plus a custom `staff_role`. We keep both, in Postgres:

- `role`: `'admin' | 'member'` — the coarse gate every guard checks.
- `staff_role`: the specific office (`treasurer`, `loan_officer`, …) — routes tasks and labels UI;
  used for finer checks where policy requires a specific office.

Centralise enforcement in `lib/auth/guards.ts`. Never hand-roll an ownership check in a component.

```ts
requireMember()                 // signed in + onboarding_status = 'active'
requireOfficer()                // role = 'admin'
requireOfficer('treasurer')     // role = 'admin' AND staff_role in the allowed set
requireSelfOrOfficer(memberId)  // acting member owns the record, or is an officer
```

Defence in depth: app-layer guards are the primary control (clear, testable). Postgres Row-Level
Security policies may be layered on later; if added, they must not replace the app-layer guards.

---

## 5. Repository shape

```
app/
  (member)/                 # gated: signed in + onboarding complete
    dashboard/  contributions/  loans/  investments/  welfare/  notices/
  onboarding/               # gated: signed in, onboarding not yet active
  admin/                    # gated: role = 'admin'
    members/ onboarding/ contributions/ loans/ welfare/
    investments/ approvals/ communications/ audit/ reports/
  api/                      # route handlers only where external access is needed
lib/
  db/         # Kysely instance, generated types, query helpers
  auth/       # NextAuth config + guards
  audit/      # writeAudit(tx, {...}) helper — always called inside the txn
  actions/    # server actions grouped by domain
  validation/ # Zod schemas (shared client/server)
migrations/   # Kysely migrations, forward-only
components/    # shadcn/ui-based, mobile-first
tests/        # unit + integration; guardrail tests are mandatory (see §7)
```

---

## 6. Coding conventions

- TypeScript strict; no `any` in domain code. Money as integer minor units **or** `numeric(14,2)` —
  pick one and never mix; validate `>= 0`.
- All financial mutations run in a **single Kysely transaction** with the audit write included.
- Server actions: validate input with Zod → authorise with a guard → do work in a transaction →
  revalidate. Never trust `member_id` from the client; derive it from the session.
- Enums live in Postgres (enum types or `CHECK`) **and** as Zod enums — keep them in sync.
- Currency formatting via one `formatNGN()` helper; dates via one `formatDate()` (dd-mm-yyyy).
- Keep officer-only fields out of member-facing queries (select explicit columns, not `select *`).

---

## 7. Definition of done (and mandatory tests)

A feature is done when it works **and** its guardrail is proven by a test. Minimum guardrail tests:

- A member cannot read another member's contribution / loan / subscription / welfare record.
- A member cannot reach `/admin/*` or call an officer-only action.
- A member cannot confirm any contribution (including their own).
- A loan cannot reach `approved` on one officer's approval; the *same* officer approving twice does
  not advance it; two *distinct* officers do.
- `audit_logs` rejects UPDATE and DELETE.
- One member can cast at most one vote per resolution.
- No screen or API response exposes a merged cross-pool balance or a guaranteed-return figure.

Commands (wire these up in `package.json`): `pnpm dev`, `pnpm build`, `pnpm typecheck`,
`pnpm lint`, `pnpm test`, `pnpm db:migrate`, `pnpm db:seed`. Run `typecheck` + `test` before
declaring any phase complete.

---

## 8. Build order

Follow the phased sequence in **FMF_ClaudeCode_Build_Spec.md** (§Build phases). Build and test one
phase before starting the next. Do not scaffold screens before the schema and guards exist. Do not
load real member data until the guardrail tests in §7 all pass.

---

## 9. Legal & compliance gates (do not bypass in code or copy)

The build is deliberately structured so no substantial funds move before controls are approved.
These are business gates, but they constrain the app's copy and launch:

- Cooperative registration under the applicable **State Cooperative Societies Law** (for a Makurdi-
  registered society, likely the Benue State authority — confirm).
- **Nigeria Data Protection Act 2023 / NDPC** obligations for member KYC data.
- The **SEC** question on the Investment Club's structure, before capital is raised.

Never write app copy that asserts registration, guarantees, or regulatory status that has not been
confirmed. When unsure, use neutral language and flag it.

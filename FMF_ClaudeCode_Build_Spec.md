# FMF Member Economic Hub — Claude Code Build Specification

**The FMF Member Economic Hub — entities, roles, screens, workflows and controls, repurposed from the Base44 build spec into an owned Next.js/Postgres codebase for Claude Code.**

| | |
|---|---|
| **Purpose** | A build brief to construct the FMF platform MVP with Claude Code |
| **Derived from** | FMF Digital Platform — Base44 Build Specification; FMF Base44 Build Checklist; FMF Constitution & Policy Pack (DRAFT); FMF Pilot Script & Pre-Publish Checklist |
| **Build target** | Next.js 15 · TypeScript · PostgreSQL · Kysely · NextAuth.js v5 · shadcn/ui + Tailwind · Vercel |
| **Status** | Working build specification — MVP scope, with Phase-2 backlog |
| **Date** | September 2026 |

---

## 0. Why this document (and what changed from Base44)

The FMF platform was previously specified for Base44, an AI no-code app builder: you describe
entities and screens in prose, and the platform generates a document-store app with its own
row-level-security syntax. This document is the **same product, same governance, translated for a
coded build**. Claude Code writes the actual application, so the model gets stronger where it
matters most for a body that handles member money:

| Concern | Base44 (before) | Claude Code build (now) |
|---|---|---|
| Data model | Document store; relationships as string ids | Relational Postgres with real **foreign keys** and constraints |
| Row-level security | Per-entity RLS JSON blocks | App-layer guards (primary) + optional Postgres RLS (defence in depth) |
| Dual-control | "increment approval_count if not already approved" in app logic | **`UNIQUE(target, target_id, approver_id)`** — two distinct officers enforced by the DB |
| One-vote-per-resolution | App logic | **`UNIQUE(resolution_id, member_id)`** at the DB |
| Immutable audit | RLS `update:false, delete:false` | Revoked table privileges + trigger — append-only at the DB |
| Financial atomicity | Best-effort | **Transactions**: the money change and its audit row commit together or not at all |
| Ownership | Base44 built-in login | NextAuth v5 session; `member_id` always derived server-side |

Everything in §3 (Non-negotiable guardrails) of `CLAUDE.md` still holds. This spec fills in the
schema, routes and workflows that implement them.

---

## 1. How Claude Code should use this document

1. **Read `CLAUDE.md` first**, then this spec end to end.
2. **Build in the phase order in §11.** Scaffold → schema → auth/guards → member screens →
   admin console → controls → reports → pilot. Test after each phase.
3. **Schema before screens.** Create the tables and enums (§4) and the guards (§5) before any UI.
4. **Every financial mutation is a transaction that also writes `audit_logs`** (§7).
5. **Prove each guardrail with a test** (`CLAUDE.md` §7) before moving on.
6. **Do not load real member data** until all guardrail tests pass and the pre-publish checklist
   (§12) is cleared.

---

## 2. Product overview and scope

An **FMF Member Economic Hub**, not merely a payment website: participation is easy for members,
while every financial action stays traceable for governance. Two separately-governed functions —
the Cooperative Society (savings, welfare, credit) and the Investment Club (opt-in investment) —
share one role-controlled system.

**In scope (MVP):** member registration and login; unique FMF Member ID; participation selection
(Cooperative / Investment / Both / Information-only); KYC document upload; digital acceptance of
rules; contribution recording and officer confirmation; member statements; loan application with
dual-approval; investment opportunity room and subscription records; welfare requests; announcements
and document library; resolutions and voting; membership and financial dashboards; a complete audit
trail.

**Out of scope (Phase 2):** automated payment-gateway collection; automated portfolio valuation and
distributions; large-scale e-voting; group-purchasing marketplace; native mobile apps. See §13.

**Design guardrail carried from the proposal:** no individual has unilateral authority over funds
(sensitive actions need two approvals); savings, welfare, investment capital and operating income
are separate records, never mixed; no screen promises or implies guaranteed returns.

---

## 3. Domain glossary (maps FMF terms to code)

- **Member** — an authenticated user with a `member_profiles` row; owns their financial records.
- **Officer** — a member with `role = 'admin'`; `staff_role` names the office.
- **Pools** — separately-accounted funds: savings, welfare, investment, registration/operating.
  Modelled as distinct `contributions.type` values; never summed together.
- **Dual-control** — two `approvals` rows from two distinct officers required to advance a loan,
  allocate a subscription, or pay welfare above threshold.
- **Onboarding gate** — a member with `onboarding_status <> 'active'` is confined to the wizard.

---

## 4. Data model — PostgreSQL schema

Twelve entities become tables. Primary keys are `uuid` (default `gen_random_uuid()`). Every table
carries `created_at timestamptz default now()` and `created_by uuid` (the acting user), unless noted.
Enum values below become Postgres enum types (or `text` + `CHECK`) **and** Zod enums — keep in sync.
Ownership is by `member_id uuid` (FK → `users.id`), replacing Base44's `member_email`.

> NextAuth v5 with a Postgres adapter manages `users`, `accounts`, `sessions`,
> `verification_tokens`. Do not redefine those. FMF fields live in a 1:1 `member_profiles` table so
> the adapter is never fought.

### 4.1 member_profiles (extends the auth user)

| Column | Type / enum | Notes |
|---|---|---|
| `user_id` | uuid, FK→users.id, **unique** | 1:1 with auth user |
| `fmf_member_id` | text, **unique** | e.g. `FMF-0001`; generated on onboarding finish |
| `phone` | text | |
| `participation_option` | `cooperative \| investment \| both \| information_only` | default `information_only` |
| `membership_category` | `founding \| active \| associate \| honorary` | default `active` |
| `tier` | `basic \| standard \| growth \| investor \| none` | default `none` |
| `monthly_contribution` | numeric(14,2) | default 0; indicative NGN |
| `payment_frequency` | `monthly \| quarterly \| annually` | default `monthly` |
| `staff_role` | `member \| president \| vice_president \| secretary \| treasurer \| financial_secretary \| welfare_officer \| loan_officer \| investment_committee \| trustee \| auditor \| administrator` | default `member` |
| `role` | `admin \| member` | default `member`; the coarse gate |
| `kyc_status` | `not_started \| submitted \| verified \| rejected` | default `not_started` |
| `kyc_document_url` | text | Vercel Blob URL; officer/owner read only |
| `onboarding_status` | `registered \| profile_complete \| kyc_complete \| consented \| tier_selected \| active` | default `registered` |
| `consent_accepted` | boolean | default false |
| `consent_date` | timestamptz | |
| `status` | `active \| inactive \| suspended` | default `active` |

### 4.2 contributions

`member_id` FK · `type` (`savings | welfare | investment | registration | admin_levy`, default
`savings`) · `amount` numeric(14,2) ≥ 0 · `currency` text default `'NGN'` · `period` text (e.g.
`2026-09`) · `method` (`bank_transfer | card | cash | other`, default `bank_transfer`) ·
`payment_reference` text · `receipt_url` text · `status` (`pending | confirmed | rejected`,
default `pending`) · `confirmed_by` uuid FK→users.id · `confirmed_date` timestamptz · `notes` text.
**Required:** member_id, type, amount. Members create; **only officers confirm** (writes audit).

### 4.3 loans

`member_id` FK · `amount` numeric(14,2) ≥ 0 · `purpose` text · `tenor_months` int 1–36 ·
`interest_rate` numeric (annual %, from loan policy) · `status` (`applied | under_review |
approved | disbursed | repaying | closed | rejected`, default `applied`) · `approval_count` int
default 0 (**derived** from `approvals`, not client-set) · `disbursed_date` date ·
`outstanding_balance` numeric(14,2) default 0 · `decision_notes` text (**officer-only**).
**Required:** member_id, amount, purpose. Rule: `status` may become `approved` only when two distinct
officer approvals exist (§7.3).

### 4.4 loan_repayments

`loan_id` FK→loans.id · `member_id` FK · `amount` numeric(14,2) ≥ 0 · `paid_date` date · `method`
(`bank_transfer | card | cash | salary_deduction | other`) · `status` (`pending | confirmed`,
default `pending`). **Required:** loan_id, member_id, amount.

### 4.5 investment_opportunities

`title` · `description` · `asset_class` (`fixed_income | money_market | equities | real_estate |
private_business | agriculture | other`) · `risk_level` (`low | low_moderate | moderate |
moderate_high | high`) · `min_subscription` numeric(14,2) ≥ 0 · `target_amount` numeric(14,2) ≥ 0 ·
`raised_amount` numeric(14,2) default 0 · `disclosure_url` text · `status` (`draft | open |
closed | cancelled`, default `draft`) · `opens_on` date · `closes_on` date. **Required:** title,
asset_class, risk_level. Officers create/update; all members read (visibility gated in UI by
participation). **Never store or render a projected/guaranteed return.**

### 4.6 investment_subscriptions

`opportunity_id` FK→investment_opportunities.id · `member_id` FK · `amount` numeric(14,2) ≥ 0 ·
`units` numeric default 0 · `status` (`requested | approved | allocated | rejected | exited`,
default `requested`) · `risk_acknowledged` boolean default false. **Required:** opportunity_id,
member_id, amount. Members create (must acknowledge risk); allocation to `allocated` needs two
approvals; `raised_amount` on the opportunity updates as subscriptions are allocated.

### 4.7 welfare_claims

`member_id` FK · `category` (`bereavement | medical | emergency | education | other`) ·
`amount_requested` numeric(14,2) ≥ 0 · `reason` text · `evidence_url` text · `status` (`submitted |
under_review | approved | paid | rejected`, default `submitted`). **Required:** member_id,
category, amount_requested. Payout above the policy threshold requires a second approval (§7).

### 4.8 announcements

`title` · `body` · `category` (`notice | newsletter | policy | meeting | report`, default
`notice`) · `file_url` text · `is_policy` boolean default false · `audience` (`all | cooperative |
investment | officers`, default `all`). **Required:** title. Officers create; members read
according to `audience`.

### 4.9 resolutions

`title` · `description` · `options` text[] default `{For,Against,Abstain}` · `status` (`draft |
open | closed`, default `draft`) · `opens_on` date · `closes_on` date. **Required:** title.

### 4.10 votes

`resolution_id` FK→resolutions.id · `member_id` FK · `choice` text. **Required:** all three.
**`UNIQUE(resolution_id, member_id)`** — one vote per member per resolution, enforced by the DB.
No update, no delete (votes are final).

### 4.11 approvals (dual-control)

`target_entity` (`loan | investment_subscription | welfare_claim | contribution`) · `target_id`
uuid · `approver_id` uuid FK→users.id · `approver_role` text · `decision` (`approved | rejected`) ·
`comment` text. **Required:** target_entity, target_id, approver_id, decision.
**`UNIQUE(target_entity, target_id, approver_id)`** — a given officer can record at most one
approval per item, so two `approved` rows guarantee two *distinct* officers. Officers only; no
update, no delete.

### 4.12 audit_logs (immutable)

`actor_id` uuid FK→users.id · `action` text (e.g. `contribution.confirm`, `loan.approve`,
`subscription.allocate`, `kyc.verify`, `role.change`, `resolution.open`) · `entity` text ·
`entity_id` uuid · `details` jsonb · `created_at` timestamptz default now(). **Required:** actor_id,
action. **Append-only:** in the migration, `REVOKE UPDATE, DELETE ON audit_logs FROM <app_role>;`
and add a `BEFORE UPDATE OR DELETE` trigger that raises an exception. Officers read; the app writes.

---

## 5. Roles, permissions and guards

`role` (`admin`/`member`) is the coarse gate every guard checks; `staff_role` names the office and
drives finer checks and UI labels. Centralise in `lib/auth/guards.ts` — never inline an ownership
check in a component.

**Permission matrix (summary)**

| Capability | Member | Officer (`role = admin`) |
|---|---|---|
| Register, complete onboarding, view own dashboard | ✅ | ✅ |
| Create own contribution / loan / subscription / welfare | ✅ | ✅ |
| See another member's financial records | ❌ | ✅ |
| Confirm a contribution payment | ❌ | ✅ (Treasurer / Fin. Sec.) |
| Approve a loan / allocate an investment | ❌ | ✅ — **two distinct officers** |
| Post announcements, policies, open resolutions | ❌ | ✅ (Secretary / Exec) |
| Create investment opportunities | ❌ | ✅ (Investment Committee) |
| Read the audit log | ❌ | ✅ (Auditor / Exec) |
| Edit or delete an audit-log entry | ❌ | ❌ — immutable for everyone |

Guard contract (see `CLAUDE.md` §4): `requireMember()`, `requireOfficer()`,
`requireOfficer('treasurer')`, `requireSelfOrOfficer(memberId)`. Route protection: `middleware.ts`
protects `/admin/*` (officers) and the `(member)` group (signed-in + onboarding active). Each server
action re-checks — middleware is not the last line of defence.

---

## 6. Screens and routes (App Router)

Build member screens first (6.1–6.7), then the admin console (6.8). Mobile-first throughout.

### 6.1 Onboarding wizard — `/onboarding` (11 steps)
Shown to any signed-in member whose `onboarding_status <> 'active'`; one question per step, progress
bar, resumable (persist `onboarding_status` at each step). Steps: **1** Welcome/Discover · **2**
Register (full_name, phone) · **3** Profile · **4** Choose participation → `participation_option` ·
**5** KYC upload → `kyc_status = submitted` · **6** Consent (rules, privacy, code of conduct;
checkbox) → `consent_accepted = true`, `consent_date = now()` · **7** Select tier (Basic ₦10,000 /
Standard ₦25,000 / Growth ₦50,000 / Investor ₦100,000+) → `tier`, `monthly_contribution`,
`payment_frequency` (skip if Information-only) · **8** Initial contribution (show FMF bank details;
capture `payment_reference` + receipt upload) → create `contributions` row (`type = registration`,
`status = pending`) · **9** Member ID → generate unique `fmf_member_id` (`FMF-` + zero-padded
sequence) · **10** Orientation (benefits, risks, rules, responsibilities) · **11** Finish →
`onboarding_status = active` → dashboard. **No payment is collected in-app** — only reference +
receipt recorded.

### 6.2 Member dashboard — `/dashboard`
For the logged-in member only: header (full_name, fmf_member_id); cards for **Total confirmed
savings**, **Welfare contributions**, **Current loan balance**, **Investment subscriptions total**,
each computed from that member's records; actions "Make a contribution", "Apply for a loan", and (if
participation is investment/both) "View investment opportunities"; recent activity; reminders
(pending contribution awaiting confirmation, KYC not verified). **Never show another member's
figures. Never merge pools into one balance.**

### 6.3 Contributions — `/contributions`
Member sees a table of their own contributions (period, type, amount, status, receipt); records a new
one (type savings/welfare/investment, amount, period, method, payment_reference, receipt upload) with
`status = pending`; downloads a statement of confirmed contributions. Confirmation happens in the
admin console, not here.

### 6.4 Loans — `/loans`
Member applies (amount, purpose, tenor_months → `status = applied`) and tracks loans (status,
approval progress "needs two approvals", interest_rate, outstanding_balance, repayment history). Show
that loans are subject to the loan policy and two-officer approval.

### 6.5 Investment room — `/investments`
Visible only to members whose `participation_option` is investment or both. Lists `open`
opportunities (title, asset_class, risk_level, min_subscription, disclosure link). To subscribe:
enter amount ≥ min_subscription and tick a risk-acknowledgement checkbox → `investment_subscriptions`
(`status = requested`, `risk_acknowledged = true`). Every card shows: **"Investments carry risk.
Returns are not guaranteed."** Never show projected or guaranteed returns.

### 6.6 Welfare — `/welfare`
Member submits a `welfare_claims` row (category, amount_requested, reason, optional evidence upload)
and tracks status. Officers review in the admin console.

### 6.7 Notices, documents & voting — `/notices`
Lists `announcements` the member may see (respect `audience`), with attached files. Governance
section lists open `resolutions`; member casts one `vote` per resolution (choice from the
resolution's options); voting twice is blocked (DB unique constraint + UI). Closed resolutions are
read-only.

### 6.8 Admin console — `/admin/*` (officers only)
Tabs, each a route under `/admin`:
- **Members** — all members (fmf_member_id, participation, tier, kyc_status, onboarding_status,
  status); officer sets `kyc_status = verified` and edits `staff_role`.
- **Onboarding** — members grouped by `onboarding_status`.
- **Contributions** — all contributions, filter by status; officer confirms a pending one
  (`status = confirmed`, `confirmed_by = current`, `confirmed_date = now()`) → writes audit.
- **Loans (Loan book)** — all loans; officer records an `approval`. Two approvals from two different
  officer ids required before `status = approved`; then mark `disbursed` and set outstanding_balance.
- **Welfare** — review and update claim status (payout above threshold needs a second approval).
- **Investments** — create/open/close opportunities; review subscriptions; allocate (two approvals
  before `status = allocated`).
- **Approvals** — a queue of items awaiting a second approval.
- **Communications** — create announcements, policies, resolutions.
- **Audit** — read-only list of `audit_logs` (no edit/delete control exists).
- **Reports** — totals per pool (members, contributions collected by type, loan book, subscriptions,
  cash position), each summed independently, with **CSV export** (route handler under `/api`).

---

## 7. Key workflows and business rules

Enforce these in server actions and the database — several cannot be expressed in access rules alone.

**7.1 Onboarding gating.** A member with `onboarding_status <> 'active'` is redirected to the wizard
and cannot reach transactional routes (middleware + layout guard). Each step persists status.

**7.2 Contribution confirmation.** Created `pending`. Only an officer confirms → set `confirmed_by`,
`confirmed_date`, write `audit_logs` (`contribution.confirm`) in the same transaction. Members never
confirm their own payments.

**7.3 Loan dual-approval (no unilateral authority).** In one transaction, on an officer's approval:
insert an `approvals` row (`UNIQUE(target_entity, target_id, approver_id)` makes a repeat by the same
officer fail cleanly → surface "you have already approved this; a different officer is required");
recompute `approval_count` from distinct `approved` rows; when it reaches **2**, allow
`status = approved`. A single officer can never reach `approved`. Only after `approved` may an
officer mark `disbursed` and set `outstanding_balance`. Every approval and status change writes an
audit row. **Apply the same two-approval pattern** to investment allocation and to welfare payouts
above the policy threshold.

**7.4 Investment subscription.** Created `requested` with `risk_acknowledged = true`. Allocation to
`allocated` requires two approvals; `raised_amount` on the opportunity updates as subscriptions are
allocated (in the same transaction).

**7.5 Immutable audit trail.** `audit_logs` is append-only (revoked privileges + trigger). Write an
entry for every sensitive action: contribution confirmation, loan approval/disbursement, subscription
allocation, KYC verification, role changes, resolution open/close.

**7.6 Fund separation.** Savings, welfare, investment, registration and levy are distinct
`contributions.type` values (investments are separate entities). Every report sums each pool
independently. **Never present a single merged balance.**

---

## 8. Integrations and configuration

| Need | MVP approach | Phase 2 |
|---|---|---|
| Payments | Manual: member enters `payment_reference` and uploads a receipt; an officer confirms. **No funds move in-app.** | Integrate a Nigerian gateway (Paystack / Flutterwave) for collection and reconciliation. |
| File uploads | Vercel Blob for KYC docs, receipts, disclosure docs; access restricted to owner + officers. | Virus scanning; signed short-lived URLs. |
| Notifications | Transactional email (e.g. Resend) for confirmations and status changes. | Scheduled reminders; SMS/WhatsApp. |
| Member ID | Generate `fmf_member_id` on onboarding finish (`FMF-` + zero-padded sequence). | QR code on a digital ID. |
| Exports | CSV export from the reports tab (route handler). | Scheduled statements; accountant export. |

Environment: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
`BLOB_READ_WRITE_TOKEN`, plus email provider keys. Keep secrets in Vercel env, never in the repo.

---

## 9. Security and governance guardrails (non-negotiable)

Confirm each is true — and covered by a test — before any real member data is entered.

- **Ownership** — members read/write only their own records (`member_id` = session user); officers
  wider via `role = 'admin'`.
- **No unilateral authority** — loans, allocations and large welfare payouts require two distinct
  officer approvals recorded as `approvals` rows.
- **Immutable audit log** — create-only; no edit/delete for anyone.
- **Sensitive fields** — officer-only fields (`decision_notes`, internal figures) never sent to a
  member's client; select explicit columns.
- **KYC data** — identity documents readable only by the member and authorised officers.
- **No returns promised** — investment screens always show risk; never display guaranteed/projected
  returns.
- **Least privilege** — `role = 'admin'` only for actual officers.

Reusable pattern for a member-owned resource (pseudocode):

```ts
export async function listMyContributions() {
  const user = await requireMember();
  return db.selectFrom('contributions')
    .select(['id','type','amount','status','period','receipt_url','created_at'])
    .where('member_id','=', user.id)         // ownership from session, never the client
    .orderBy('created_at','desc').execute();
}

export async function confirmContribution(id: string) {
  const officer = await requireOfficer('treasurer'); // members can never reach this
  return db.transaction().execute(async (tx) => {
    await tx.updateTable('contributions')
      .set({ status:'confirmed', confirmed_by: officer.id, confirmed_date: new Date() })
      .where('id','=', id).where('status','=','pending').execute();
    await writeAudit(tx, { actorId: officer.id, action:'contribution.confirm',
      entity:'contributions', entityId: id });                     // same transaction
  });
}
```

---

## 10. Financial controls & authorisation matrix (from the Policy Pack)

Thresholds are **illustrative** and set by the General Assembly; make them config, not hard-coded.

| Action / amount | Required approval | Approvals |
|---|---|---|
| Payment up to ₦100,000 | Treasurer + one officer | 2 |
| Payment ₦100,001 – ₦1,000,000 | Treasurer + President or Secretary | 2–3 |
| Payment above ₦1,000,000 | Executive Committee + 2 Trustees | 3+ |
| Any loan | Loan Officer recommends + 2 distinct approvals | 2 |
| Investment allocation | Investment Committee + 2 distinct approvals | 2 |
| Welfare above threshold | Welfare Officer + 1 additional approval | 2 |

MVP enforces the **two-distinct-approvals** floor generically via `approvals`; the tiered
signatory rules (3+ for large payments) are Phase-2 refinements. Store thresholds in a `settings`
table so the Assembly can change them without a deploy.

---

## 11. Build phases (build and test in order)

1. **Scaffold.** Next.js 15 + TS strict, Tailwind + shadcn/ui, Kysely + migration runner, ESLint,
   test runner. Wire `package.json` scripts (`CLAUDE.md` §7). Set NGN + dd-mm-yyyy helpers.
2. **Schema.** Migrations for all twelve entities (§4), enums, FKs, the two unique constraints
   (votes, approvals), and the append-only audit protection. Generate Kysely types. Seed script.
3. **Auth & guards.** NextAuth v5 (Google), `member_profiles` on first login, `lib/auth/guards.ts`,
   `middleware.ts`. Create one test officer and one test member.
4. **Onboarding.** The 11-step wizard (6.1) with `onboarding_status` gating; confirm a non-active
   member is confined to it.
5. **Dashboard + Contributions.** (6.2–6.3) Record a contribution; confirm pool figures are
   per-member and never merged.
6. **Loans + dual-approval.** (6.4, 7.3) Wire two-distinct-officer approval in the admin loan book.
7. **Investment room, Welfare, Notices/Voting.** (6.5–6.7) Risk copy, one-vote constraint.
8. **Admin console.** (6.8) Contribution confirmation, loan book, approvals queue, audit log.
9. **Integrations & reports.** (§8) Uploads, email, CSV export; verify §9 guardrails.
10. **Pilot.** Run the pilot pass and pre-publish checklist (§12) with 30–50 members; fix; then open
    to the full membership.

**Done when:** a member can onboard, contribute, apply for a loan, and see only their own data; an
officer can confirm a payment and needs a *second* officer to approve a loan; every sensitive action
appears in the audit log; and the guardrail tests in `CLAUDE.md` §7 all pass.

---

## 12. Pilot pass & pre-publish checklist

**Pilot pass (run manually).** Post an announcement (Communications → Announcements) and confirm it
appears on the member Notices screen. Open a resolution ("Ratify the pilot phase"; For/Against/
Abstain), cast one vote, and confirm a second vote is refused. Walk a test member through the full
11-step onboarding with their own Google account; as an officer, confirm their initial contribution
and verify their KYC, and check both appear in the audit log. **Dual-approval check (headline
control):** approve a seeded loan, confirm it advances to Approved only when a *second, different*
officer approves; then try to approve an item you already approved — it must refuse and require a
different officer.

**Pre-publish checklist (do not launch until each is done):**
- ☐ Remove all demo/seed data (seeded members, sample loans, contributions, subscriptions, welfare
  claims). Real members must not launch into fake records.
- ☐ Verify the security boundary as a non-officer: signed in as an ordinary member, you see only your
  own records and cannot reach `/admin`. **The single most important check before real money.**
- ☐ Set access deliberately: decide whether sign-up is open or restricted; configure the production
  domain and OAuth redirect URIs.
- ☐ Confirm no guaranteed-returns language anywhere (re-check after any edit).
- ☐ Clear the legal gates (§14): cooperative registration; NDPC data-protection; the SEC question on
  the Investment Club — confirmed with counsel before collecting real funds or KYC.
- ☐ Set officer accounts: grant real Executive/committee members `role = 'admin'` and the correct
  `staff_role`; remove admin from any test account.
- ☐ Deploy to production, then re-open the live URL once to confirm it loads for a signed-in member.

---

## 13. Phase-2 backlog

Automated payment-gateway collection and reconciliation; automated portfolio valuation and
distribution statements; scheduled reminders and SMS/WhatsApp; group-purchasing marketplace;
dividends/patronage where legally permitted; richer analytics and liquidity dashboards; larger-scale
e-voting; tiered signatory rules (§10) beyond the two-approval floor; Postgres RLS as a second
enforcement layer; data-retention automation and business-continuity tooling. Sequence only after the
pilot validates the MVP.

---

## 14. Assumptions, uncertainty and verification

Stated plainly, in keeping with FMF's standard.

**Tech-stack assumption (material).** This spec adopts the house stack (Next.js 15 / TypeScript /
Postgres / Kysely / NextAuth v5 / shadcn/ui / Vercel), the same one used for ABI Treaty Watch. If a
different stack is intended, that is a decision to confirm *before* scaffolding — most of §4–§9
translates, but auth and migration mechanics would change.

**Technical points to verify while building (I'm not certain of exact current syntax — confirm
against docs):**
- NextAuth.js v5 (Auth.js) is still evolving; confirm the current Postgres adapter and Google
  provider configuration against the current Auth.js docs, and confirm session-callback shape for
  attaching `role`/`staff_role`.
- Kysely does not set Postgres session variables per request, so **app-layer guards are the primary
  authorization control**; if Postgres RLS is added later, it needs a per-request `SET LOCAL` role
  or a connection-per-user pattern — verify before relying on RLS for security.
- The append-only audit guarantee depends on the app's DB role lacking UPDATE/DELETE on
  `audit_logs`; confirm the deployment's role separation (app role vs. migration/owner role) so the
  REVOKE actually binds.

**Carried-over legal & regulatory gates (business, not code — but they constrain launch and copy):**
- **Jurisdiction / cooperative registration** under the applicable State Cooperative Societies Law
  (for a Makurdi-registered society, likely the Benue State authority — confirm the correct body).
- **Nigeria Data Protection Act 2023 / NDPC** obligations for member KYC data, including whether the
  Society qualifies as a data controller of major importance requiring registration.
- **SEC / collective-investment-scheme** rules for the Investment Club's structure and custody,
  before capital is raised.
- **Figures** — all tiers, thresholds and ratios in this spec are illustrative and to be set by the
  General Assembly after the affordability survey and a professionally reviewed financial model.

**Bottom line.** This is a faithful, buildable translation of the Base44 spec into an owned
Next.js/Postgres codebase. The data model and controls are stronger for handling money — foreign
keys, transactions, and database-enforced dual-control and immutability. The framework-specific
mechanics (Auth.js config, RLS, role separation) should be spot-checked against current docs as you
build, and no substantial funds or KYC data should be handled before the §12 checklist and §14 legal
gates are cleared.

---

*FMF Coop & Investment Club — Claude Code Build Specification • September 2026. Companion files:
`CLAUDE.md` (project instructions) and `FMF_ClaudeCode_Prompt.md` (kickoff prompt).*

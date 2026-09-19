# FMF Member Economic Hub — Pilot & Pre-Publish Checklist

Derived from `FMF_ClaudeCode_Build_Spec.md` §12 and `CLAUDE.md` §9. **Do not open to the full
membership or handle real funds/KYC until every box below is cleared.**

## Pilot pass (run manually with 30–50 members)

- [ ] Post an announcement (Admin → Communications) and confirm it appears on a member's Notices screen.
- [ ] Open a resolution ("Ratify the pilot phase"), cast one vote, confirm a **second vote is refused**.
- [ ] Walk a test member through the full 11-step onboarding with their own Google account.
- [ ] As an officer, **confirm** their initial contribution and **verify** their KYC; check both appear in the Audit log.
- [ ] **Dual-approval headline check:** approve the seeded ₦80,000 loan; confirm it reaches *Approved* only when a
      *second, different* officer approves; then try to approve an item you already approved — it must refuse.

## Automated guardrails (already green — re-run before launch)

`pnpm typecheck && pnpm test` — 30 tests incl. ownership isolation, loan dual-approval, one-vote-per-resolution,
investment participation gate, no-guaranteed-return, officer-only contribution confirm, and audit_logs immutability.

## Pre-publish steps (business + config — your decisions)

- [ ] **Remove all demo/seed data:** `pnpm db:clear-demo` (removes @demo.fmf users and `DEMO —` content).
      Real members must not launch into fake records. *(Demo officers that acted during the pilot stay in the
      immutable audit log by design — mark them inactive rather than deleting.)*
- [ ] **Security-boundary check as a non-officer** — signed in as an ordinary member you can see only your own
      records and cannot reach `/admin`. *The single most important check before real money.*
- [ ] **Access model:** decide whether sign-up is open or restricted; set the production domain and OAuth
      redirect URI (`https://<domain>/api/auth/callback/google`) and move the OAuth consent screen out of *Testing*.
- [ ] **Rotate secrets shared during setup** — the Google client secret and Blob token were handled in plaintext
      during the build; issue fresh ones for production and keep them only in Vercel env (never in git).
- [ ] **KYC confidentiality (Phase 2 hardening):** blob URLs are currently public-but-unguessable. Before real KYC
      documents are stored, serve them through an authenticated route or signed short-lived URLs (build spec §8).
- [ ] **No guaranteed-returns language** anywhere (re-check after any copy edit).
- [ ] **Officer accounts:** grant real Executive/committee members `role = 'admin'` and the correct `staff_role`;
      remove admin from any test account.
- [ ] Deploy to production, then re-open the live URL once to confirm it loads for a signed-in member.

## Legal & compliance gates (§14 — confirm with counsel before real funds/KYC)

- [ ] **Cooperative registration** under the applicable State Cooperative Societies Law (likely Benue State — confirm).
- [ ] **Nigeria Data Protection Act 2023 / NDPC** obligations for member KYC data (controller-of-major-importance question).
- [ ] **SEC / collective-investment-scheme** question on the Investment Club's structure and custody, before capital is raised.
- [ ] All tiers, thresholds and ratios are **illustrative** until set by the General Assembly after the affordability
      survey and a professionally reviewed financial model. (Welfare threshold lives in the `settings` table.)

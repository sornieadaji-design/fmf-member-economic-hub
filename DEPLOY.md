# FMF Member Economic Hub — Deployment (Vercel + custom domain)

Target: **staging/pilot**. Canonical site **https://fmf-economic-hub.com.ng**; **https://fmf-economic-hub.com**
301/308-redirects to it. HTTPS only (Vercel provisions the TLS certificate automatically; Google OAuth
rejects plain-http redirect URIs for real domains).

> This is a money-handling app. Do not open it to real members / real funds until the
> `PRE_PUBLISH.md` checklist and the §14 legal gates are cleared.

## 1. Put the code on GitHub
```bash
git init && git add -A && git commit -m "FMF Member Economic Hub"
gh repo create fmf-member-economic-hub --private --source . --push
```
(`.env.local` is gitignored — secrets never leave your machine.)

## 2. Import to Vercel
New Project → import the repo. Framework auto-detects **Next.js**; no build overrides needed.
`vercel.json` already schedules the reminders cron.

## 3. Production environment variables (Vercel → Project → Settings → Environment Variables)
Set for **Production** (and Preview if you want previews to work):

| Variable | Value |
|---|---|
| `DATABASE_URL` | your Neon **production** pooled connection string (see step 6) |
| `AUTH_SECRET` | generate fresh: `openssl rand -base64 32` |
| `AUTH_URL` | `https://fmf-economic-hub.com.ng` |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | **rotated** production OAuth client (step 5) |
| `BLOB_READ_WRITE_TOKEN` | rotate for production, or reuse the pilot token |
| `BLOB_STORE_ID` | `store_i78B1w6ZHRIEiVb1` |
| `CRON_SECRET` | generate fresh: `openssl rand -hex 24` |
| `NEXT_PUBLIC_SITE_URL` | `https://fmf-economic-hub.com.ng` |
| `RESEND_API_KEY` / `EMAIL_FROM` | optional — enables reminder + confirmation emails |

## 4. Add the domains (Vercel → Settings → Domains)
1. Add **fmf-economic-hub.com.ng** — set it as the **primary** domain.
2. Add **fmf-economic-hub.com** — choose **Redirect** → target `fmf-economic-hub.com.ng` (308).

Vercel then shows the exact DNS records to create.

## 5. DNS (at your domain registrar, for BOTH domains)
Typical Vercel records (use whatever the Vercel Domains screen shows):
- Apex (`fmf-economic-hub.com.ng`, `fmf-economic-hub.com`): **A → 76.76.21.21**
- `www` subdomain (optional): **CNAME → cname.vercel-dns.com**

DNS can take minutes to a few hours to propagate; Vercel issues the HTTPS certificate once it verifies.

## 6. Database for the pilot
Reuse the existing Neon project or (cleaner) create a separate prod branch/project, then run migrations
against it:
```bash
DATABASE_URL="<prod pooled url>" pnpm db:migrate
# seed demo data only if you want a demo pilot; NEVER on a real-members DB
```

## 7. Google OAuth for the domain (Google Cloud Console → Credentials → your OAuth client)
- **Authorized redirect URI:** `https://fmf-economic-hub.com.ng/api/auth/callback/google`
- **Authorized JavaScript origin:** `https://fmf-economic-hub.com.ng`
- OAuth consent screen: add pilot testers, or publish it when you go live.

## 8. Before real members (from PRE_PUBLISH.md)
- `pnpm db:clear-demo` to remove demo data.
- Rotate the Google client secret, Blob token, and AUTH_SECRET/CRON_SECRET for production.
- Sign in as an ordinary member and confirm you cannot reach `/admin` or see others' data.
- Clear the §14 legal gates (cooperative registration, NDPC, SEC) with counsel.
- Harden KYC storage (private blobs + signed URLs) before storing real ID documents.

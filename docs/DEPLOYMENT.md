# Deployment

Targets: **Vercel** (app) · **Supabase** (DB + auth, region Mumbai) · **Razorpay** · **n8n** · custom domain.

## Branches

`feature/*` / `fix/*` → `develop` (staging) → `main` (production).

## First-time setup

1. **Supabase**: create project (Mumbai). Link and push migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npm run db:push
   ```
2. **Vercel**: import the GitHub repo, framework = Next.js. Add env vars from ENVIRONMENT.md for Production and Preview.
3. **Supabase Auth URLs**: add the Vercel URL (and later the domain) + `/auth/callback` to Redirect URLs.
4. **Create the first admin** (DAILY-OPERATIONS.md).

## Every release

```bash
npm run check   # lint + typecheck + tests + production build
```
Then:
1. Review the diff, especially `supabase/migrations/`, payments, auth.
2. Apply new migrations to staging (`db:push` against the staging project), test.
3. Merge to `main`; Vercel deploys. Apply migrations to production **before** code that depends on them.
4. Smoke test: home, login, dashboards, RSVP and payment flow (once they exist).

## After buying the domain

Update: `NEXT_PUBLIC_APP_URL`, Supabase Site URL + Redirect URLs, Google OAuth (if the consent screen lists the domain), Razorpay webhook URL, n8n webhooks. Redeploy. HTTPS is automatic on Vercel.

## Rollback

Vercel → Deployments → promote the previous deployment. Database migrations are forward-only: write a new migration to undo a schema change.

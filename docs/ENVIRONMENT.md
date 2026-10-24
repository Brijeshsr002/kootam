# Environment

Copy `.env.example` → `.env.local` (never committed). In Vercel, set the same keys under Project → Settings → Environment Variables.

| Variable | Where to get it | Public? |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; `https://<domain>` in production | yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API Keys → Project URL | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page → publishable (`sb_publishable_…`) or legacy anon key | yes (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | same page → secret (`sb_secret_…`) or legacy service_role key | **SECRET — server only, bypasses RLS** |
| `RAZORPAY_KEY_ID` | dashboard.razorpay.com → Account & Settings → API Keys | used by checkout (Phase 4) |
| `RAZORPAY_KEY_SECRET` | same | **SECRET** |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay → Webhooks (you choose it) | **SECRET** |
| `N8N_WEBHOOK_URL` / `N8N_WEBHOOK_SECRET` | your n8n instance | **SECRET** |

`lib/env.ts` validates public values; `lib/env.server.ts` holds secrets and cannot be imported into client code (`server-only`).

## Configured in the Supabase dashboard (not env vars)

**Authentication → URL Configuration**
- Site URL: `http://localhost:3000` (later your domain)
- Redirect URLs: `http://localhost:3000/auth/callback`, `https://<domain>/auth/callback`

**Authentication → Sign In / Providers**
- **Email**: enabled. Free tier's built-in mailer is heavily rate-limited (a few emails/hour) — fine for testing; add custom SMTP before launch.
- **Google**: paste Client ID + Client Secret from Google Cloud Console → APIs & Services → Credentials → OAuth client (Web). Authorized redirect URI = the callback URL Supabase shows on that page (`https://<ref>.supabase.co/auth/v1/callback`).
- **Phone**: needs an SMS provider (Twilio / MessageBird / Vonage / Textlocal). For free testing, add **test phone numbers + fixed OTPs** on the same page. Real Indian SMS requires DLT registration.

## If a secret leaks

1. Rotate it at the provider immediately.
2. Update Vercel env vars and `.env.local`.
3. Redeploy.
4. Review Supabase / Razorpay logs for misuse.

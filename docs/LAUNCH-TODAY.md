# Launch today: step by step

Goal: Kootam live on a public URL with **free events**, organisers creating
communities, members registering, QR check-in, and SEO on.
Paid tickets wait for Razorpay (needs KYC).

Total time: about 45 minutes. Everything below is on free tiers.

---

## 1. Supabase (database + login), about 15 min

1. Go to <https://supabase.com> → **New project**.
   - Name: `kootam` · Region: **South Asia (Mumbai)** · save the database password somewhere safe.
2. Apply the schema. **Option A (easiest):** Supabase → **SQL Editor** → paste and **Run** each file
   from `supabase/migrations/` **in this order**:
   1. `20261024000001_core_schema.sql`
   2. `20261024000002_auth_roles_rls.sql`
   3. `20261024000003_reference_data.sql`
   4. `20261025000004_event_operations.sql`

   **Option A2 (one paste):** paste `supabase/setup.sql` (all four files bundled) and Run once.

   **Option B (CLI):** `npx supabase login` → `npx supabase link --project-ref <ref>` → `npm run db:push`.
3. **Authentication → Sign In / Providers → Email**: keep enabled. For launch day, turn **off**
   "Confirm email" (the free mailer only sends a few emails an hour). Turn it back on once you add
   custom SMTP (Resend, Brevo, etc.).
4. **Google login (recommended):** Google Cloud Console → APIs & Services → Credentials → OAuth
   client (Web). Authorized redirect URI = the callback URL Supabase shows on the Google provider page.
   Paste the Client ID and Secret into Supabase.
5. **Project Settings → API Keys**: copy the **Project URL**, the **publishable/anon key** and the
   **secret/service_role key**.

## 2. GitHub, about 2 min

Create an empty repo (e.g. `kootam`, private is fine), then from `C:\Users\Admin\Downloads\Kootam`:

```bash
git remote add origin https://github.com/<you>/kootam.git
git push -u origin main
```

## 3. Vercel (hosting), about 10 min

1. <https://vercel.com> → sign in with GitHub → **Add New → Project** → import `kootam`.
2. Framework: Next.js (auto). Add **Environment Variables** (Production + Preview):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_APP_URL` | `https://<project>.vercel.app` (your domain later) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable/anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | secret key (**never** share this) |
   | `NEXT_PUBLIC_PHONE_AUTH_ENABLED` | `false` |

3. **Deploy.** Then copy the live URL.
4. Back in Supabase → **Authentication → URL Configuration**:
   - Site URL: `https://<project>.vercel.app`
   - Redirect URLs: `https://<project>.vercel.app/auth/callback` (and `http://localhost:3000/auth/callback`)
5. If you changed `NEXT_PUBLIC_APP_URL` after the first deploy, redeploy (Deployments → ⋯ → Redeploy).

## 4. Make yourself admin, about 2 min

Sign up on the live site, then in Supabase SQL Editor:

```sql
update public.users set role = 'ADMIN'
where id = (select id from auth.users where email = 'you@example.com');
```

Log out and in again → you can open `/admin`.

## 5. Smoke test on your phone, about 10 min

1. Sign up as an **organiser** → create a community → create a free event with 2 spots → publish.
2. Tap **Share on WhatsApp**. Check the preview card shows the event title.
3. On a second account (or a friend's phone): open the link → **Count me in** → see the QR in My tickets.
4. A third account → the event shows **Full** → **Join the waitlist**.
5. Second account cancels → the third account is moved up automatically.
6. Organiser's phone: open the camera, scan the QR → "✓ <name> is in".
7. After the start time: **Complete event** → anyone not checked in becomes a no-show.

## 6. SEO, about 5 min

Already built in: page titles and descriptions, canonical URLs, Open Graph and Twitter images for
every community and event, `Event` / `SportsOrganization` / `FAQPage` / `ItemList` structured data,
`/sitemap.xml` (hourly), `/robots.txt` (dashboards blocked), a web manifest and an icon.

To do after deploy:

1. <https://search.google.com/search-console> → add your URL → **HTML tag** method → put the
   `content` value into the Vercel env var `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` → redeploy → Verify.
2. Search Console → Sitemaps → submit `sitemap.xml`.
3. Check one event page with <https://search.google.com/test/rich-results>.
4. When you buy a domain: add it in Vercel → Domains, then update `NEXT_PUBLIC_APP_URL`, the
   Supabase Site URL and Redirect URLs, and Google OAuth if you set it up.

## Before telling the public

- [ ] Replace the placeholder contact email in `app/privacy/page.tsx`
- [ ] Get the privacy and terms pages reviewed when you can
- [ ] Run at least one real event with a pilot organiser

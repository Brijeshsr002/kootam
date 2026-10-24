# Kootam

The operating system for offline communities: run clubs, pickleball groups, trek clubs, socials.
One shareable link per event: UPI payments, refundable no-show deposits, auto-waitlists, QR check-in.

Launch: Coimbatore (then Bengaluru, Chennai). Product spec: [docs/MASTER-SPEC.md](docs/MASTER-SPEC.md).

**Stack:** Next.js 16 · TypeScript · Tailwind 4 · Supabase (Postgres + Auth) · Razorpay · n8n · Vercel

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase values (docs/ENVIRONMENT.md)
npm run dev                  # http://localhost:3000
```

Apply the database schema to your Supabase project:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npm run db:push
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route types + `tsc` |
| `npm test` | Unit + database tests (no Docker needed — uses PGlite) |
| `npm run build` | Production build |
| `npm run check` | All of the above — run before every merge |
| `npm run db:new <name>` | New migration file |
| `npm run db:push` | Apply migrations to the linked Supabase project |

## Docs

[Master spec](docs/MASTER-SPEC.md) · [Database](docs/DATABASE.md) · [Environment](docs/ENVIRONMENT.md) · [Deployment](docs/DEPLOYMENT.md) · [Daily operations](docs/DAILY-OPERATIONS.md)

## Build status

- [x] Phase 1 — schema, RLS, auth & roles, tests, docs
- [ ] Phase 2 — communities & events, public pages, WhatsApp share
- [ ] Phase 3 — free RSVP, waitlist, my tickets + QR
- [ ] Phase 4 — Razorpay payments, seat holds, deposits & refunds
- [ ] Phase 5 — guest list, QR check-in, co-hosts, payouts
- [ ] Phase 6 — reminders (n8n), city discovery, organiser analytics, SEO
- [ ] Phase 7 — security review, load test, production deploy

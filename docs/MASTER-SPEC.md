# Kootam — Master Build Spec

> Working name. "Kootam" (கூட்டம்) means a gathering. The brand lives in a few
> strings (`app/layout.tsx`, `components/site-header.tsx`), so it is easy to change.

## 1. Mission

Kootam is the operating system for **recurring offline communities**: run clubs,
pickleball and turf groups, trek clubs, book clubs, cafe socials.

Today these run on WhatsApp groups + Google Forms + UPI screenshots. Organisers
lose money and hours to:

- chasing and matching UPI payments
- free RSVPs who never show up (often 30–40%)
- manual waitlists ("anyone dropping?")
- no member list, no attendance history, no recurring fees

Kootam replaces that with one shareable link per event:

```
organiser creates event → shares link in WhatsApp group
→ member taps, pays (or RSVPs) in seconds → full? auto-waitlist
→ QR check-in at the venue → deposit refunded to those who showed up
→ organiser sees revenue, regulars, and who went quiet
```

AI is not the product. Automation (reminders, waitlist offers) is plumbing.

## 2. Wedge and expansion

1. **Coimbatore run clubs + pickleball groups** (weekly, money every time, no-show pain)
2. All sports communities → 3. social/hobby clubs with memberships
4. Bengaluru, Chennai, more cities → 5. consumer discovery: "what's on near me this weekend"

Do not build for stage N+1 before stage N works: **20 Coimbatore communities
running every event through Kootam, with members returning weekly.**

## 3. Money

| Who pays | What | Default |
|---|---|---|
| Attendee | Platform fee on top of a paid ticket | 4%, min ₹5 (`platform_settings`) |
| Attendee | Refundable deposit on "free" events (refunded after check-in) | set per event |
| Organiser | Club Pro (memberships, analytics, custom page) — later | ₹499–999/month |

Free events stay free with no fee: they are the growth loop.
Paid events need a verified payout account (Razorpay Route, Phase 5).

## 4. Stack

Next.js 16 · TypeScript · Tailwind 4 · Supabase (Postgres + Auth + RLS) ·
Razorpay (Orders + Route) · n8n for non-critical notifications · Vercel.

## 5. Roles

| Role | Can |
|---|---|
| MEMBER | join communities, RSVP / buy tickets, waitlist, show QR, cancel within policy |
| ORGANIZER | everything a member can + create communities, run events, check in, see revenue |
| ADMIN | everything + verify payouts, suspend communities/users, settings |

Per-community power is in `community_hosts` (OWNER + CO_HOSTs), not the global role.

Login: members = Google or phone OTP · organisers = Google or email/password.

## 6. Domain rules (enforced in the database)

**Event:** `DRAFT → PUBLISHED | CANCELLED`, `PUBLISHED → CANCELLED | COMPLETED`.
Hosts may publish and cancel drafts; cancelling/completing a published event is
server-only (refunds, no-show marking). Paid/deposit events cannot publish
without `payout_status = VERIFIED`. Price is frozen once anyone registers;
capacity can never drop below seats taken.

**Registration:**
```
PENDING_PAYMENT → CONFIRMED | CANCELLED
WAITLISTED      → PENDING_PAYMENT | CONFIRMED | CANCELLED
CONFIRMED       → CHECKED_IN | CANCELLED | NO_SHOW
```
- Seats taken = CONFIRMED + CHECKED_IN + NO_SHOW + unexpired PENDING_PAYMENT holds.
- Every seat claim locks the event row, so the last seat can't be sold twice.
- One live registration per person per event.
- A payment that arrives after its hold lapsed, when the event has since filled, is refused → refund.
- Money snapshot (ticket, fee, %) is frozen on the registration.

## 7. Build phases (stop after each for review)

- [x] **Phase 1 — Foundation:** schema, RLS, auth & roles, tests, docs
- [ ] **Phase 2 — Communities & events:** host onboarding, create community, create/edit/publish events, public community page `/c/[slug]` and event page `/c/[slug]/[event]`, WhatsApp share, OG images
- [ ] **Phase 3 — Free RSVP & waitlist:** one-tap RSVP, auto-waitlist, waitlist promotion, "My tickets" with QR, attendee cancel
- [ ] **Phase 4 — Payments:** Razorpay orders, seat holds, server-side verification + webhook, deposit refunds after check-in, refunds on host cancel
- [ ] **Phase 5 — Host tools:** guest list, QR check-in scanner, mark complete (→ NO_SHOW), co-hosts, payout onboarding + admin verification
- [ ] **Phase 6 — Growth:** WhatsApp/SMS reminders via n8n, city discovery page, organiser analytics (show-up rate, regulars, churned), SEO
- [ ] **Phase 7 — Launch:** security review, load test on a hot event, production deploy

## 8. North-star metric

**Checked-in attendees per week.** Not signups, not page views.
Also watch: % of a community's events run through Kootam, show-up rate, week-4 member retention.

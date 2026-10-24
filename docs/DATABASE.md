# Database

Supabase Postgres. Schema lives in `supabase/migrations/` (forward-only). Money is integer **paise**.

## Tables

| Table | Purpose |
|---|---|
| `users` | Profile per auth user. `role`: MEMBER, ORGANIZER, ADMIN |
| `cities`, `categories` | Reference data (launch cities, community types) |
| `communities` | A club/group. Live immediately; `payout_status` gates paid events |
| `community_hosts` | OWNER (auto-added) + CO_HOSTs who manage a community |
| `community_members` | People who joined. ACTIVE / LEFT / BANNED |
| `events` | One gathering. `pricing`: FREE / PAID / DEPOSIT, optional `capacity` |
| `registrations` | One person's ticket. Status machine, money snapshot, QR `check_in_token` |
| `payments` | Razorpay order/payment + refund state. Never card data |
| `notifications` | Outbound message log |
| `platform_settings` | Fee %, minimum fee, hold minutes… (server-only) |

## Guarantees enforced in SQL (see triggers in `…_core_schema.sql`)

- Event and registration state machines (see MASTER-SPEC §6).
- **No overselling:** every seat claim locks the event row and recounts seats.
  Unexpired payment holds count as taken; lapsed ones don't.
- One live registration per (event, user).
- Paid/deposit events can't publish until the community's payouts are VERIFIED.
- Price frozen after the first registration; capacity ≥ seats taken.
- Registration money and QR token are frozen after insert.
- Browser roles can never write registrations, payments, settings, community
  status, payout status or ownership.

## Row Level Security summary

| Table | anon | authenticated |
|---|---|---|
| communities | read ACTIVE | + hosts read/edit their own; organisers create |
| events | read non-draft of active communities | + hosts create/edit/publish; drafts visible to hosts |
| community_members | — | own rows; hosts see/ban their members |
| registrations | — | read own; hosts read their events' guest list |
| payments | — | read own; admins all |
| platform_settings | — | — (service role only) |

## Tests

`npm test` boots the migrations in PGlite with a minimal Supabase auth stub
(`tests/db/harness.ts`) and checks the rules above as each role.
Concurrency (two buyers, one seat) is guaranteed by the row lock but needs a
real Postgres to test; that load test is in Phase 7.

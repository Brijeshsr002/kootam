# Daily operations

## Create the first admin

1. Sign up normally (any method).
2. Supabase → SQL Editor:
   ```sql
   update public.users set role = 'ADMIN'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
3. Log out and back in → you land on `/admin`.

After that, admins can promote others with `select public.admin_set_user_role('<user-uuid>', 'ADMIN');` while signed in (admin UI arrives in Phase 5).

## Promote a user to organiser manually

```sql
update public.users set role = 'ORGANIZER' where id = '<user-uuid>';
```

## Change a business rule

Edit `platform_settings` (admin settings page in Phase 5; SQL until then):
```sql
update public.platform_settings set value = '5' where key = 'platform_fee_percentage';
```
Existing registrations keep their snapshotted fee.

## Add a launch city or category

```sql
insert into public.cities (name, slug, state) values ('Madurai', 'madurai', 'Tamil Nadu');
insert into public.categories (name, slug) values ('Dance', 'dance');
```
Prefer a migration if it should exist in every environment.

## Verify a community's payouts (until the Phase 5 admin UI)

Only after checking the organiser's KYC / payout account:
```sql
update public.communities set payout_status = 'VERIFIED' where slug = '<community-slug>';
```

## Daily checks

Morning: yesterday's events, check-ins vs registrations (show-up rate), failed payments, pending refunds, cancellations, new communities, n8n failures, server errors, complaints.
Evening: new communities, events published, registrations, check-ins, GMV, platform fees, refunds.

**Never edit production data casually.** Prefer the admin UI; if SQL is unavoidable, write it down (what, why, who) first.

-- Auth integration, role helpers and Row Level Security.
--
-- Principle: the browser (anon / authenticated roles) may only touch its own
-- data, and only the columns listed below. Money, registration, check-in and
-- payout state are written exclusively by trusted server code (service role).

-- ---------------------------------------------------------------------------
-- Role helpers (security definer so policies can call them without recursion)
-- ---------------------------------------------------------------------------
create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.users where id = auth.uid() and status = 'ACTIVE';
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'ADMIN', false);
$$;

create function public.is_community_host(target_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_hosts h
    join public.users u on u.id = h.user_id and u.status = 'ACTIVE'
    where h.community_id = target_community_id and h.user_id = auth.uid()
  );
$$;

create function public.is_community_owner(target_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_hosts h
    where h.community_id = target_community_id and h.user_id = auth.uid() and h.role = 'OWNER'
  );
$$;

create function public.is_event_host(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = target_event_id and public.is_community_host(e.community_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- auth.users → public.users
-- A signup may request ORGANIZER; anything else (including ADMIN) becomes
-- MEMBER. Admins are promoted manually (see docs/DAILY-OPERATIONS.md).
-- ---------------------------------------------------------------------------
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.users (id, email, phone, name, avatar_url, role)
  values (
    new.id,
    nullif(new.email, ''),
    nullif(new.phone, ''),
    left(coalesce(meta ->> 'full_name', meta ->> 'name'), 120),
    meta ->> 'avatar_url',
    case when meta ->> 'requested_role' = 'ORGANIZER'
      then 'ORGANIZER'::public.user_role
      else 'MEMBER'::public.user_role
    end
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create function public.sync_auth_user_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users
     set email = nullif(new.email, ''),
         phone = nullif(new.phone, '')
   where id = new.id;
  return new;
end;
$$;
create trigger on_auth_user_contact_changed
  after update of email, phone on auth.users
  for each row execute function public.sync_auth_user_contact();

-- ---------------------------------------------------------------------------
-- Role-change RPCs
-- ---------------------------------------------------------------------------

-- Any active member may start running a community. Organisers still attend
-- other people's events, so nothing is lost by switching.
create function public.become_organizer()
returns public.user_role
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.user_role;
begin
  update public.users u
     set role = 'ORGANIZER'
   where u.id = auth.uid()
     and u.role = 'MEMBER'
     and u.status = 'ACTIVE'
  returning u.role into result;

  return coalesce(result, public.current_user_role());
end;
$$;

create function public.admin_set_user_role(target_user_id uuid, new_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = 'insufficient_privilege';
  end if;
  update public.users set role = new_role where id = target_user_id;
end;
$$;

revoke execute on function public.become_organizer() from public, anon;
revoke execute on function public.admin_set_user_role(uuid, public.user_role) from public, anon;
grant execute on function public.become_organizer() to authenticated;
grant execute on function public.admin_set_user_role(uuid, public.user_role) to authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.sync_auth_user_contact() from public, anon, authenticated;
revoke execute on function public.add_owner_as_host() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Table & column privileges (RLS then filters rows)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant select on public.categories, public.cities, public.communities, public.events
  to anon, authenticated;
grant select on public.users, public.community_hosts, public.community_members,
                public.registrations, public.payments, public.notifications
  to authenticated;

grant update (name, phone, avatar_url) on public.users to authenticated;

grant insert (owner_id, category_id, city_id, name, slug, tagline, description, logo_url,
              cover_image_url, instagram_handle, whatsapp_group_url, visibility)
  on public.communities to authenticated;
grant update (category_id, city_id, name, tagline, description, logo_url, cover_image_url,
              instagram_handle, whatsapp_group_url, visibility)
  on public.communities to authenticated;

-- Owners add/remove co-hosts; the OWNER row itself is managed by triggers.
grant insert (community_id, user_id), delete on public.community_hosts to authenticated;

-- People join and leave communities themselves.
grant insert (community_id, user_id), update (status) on public.community_members to authenticated;

grant insert (community_id, city_id, title, slug, description, cover_image_url, venue_name,
              venue_address, maps_url, starts_at, ends_at, capacity, pricing, price,
              waitlist_enabled, registration_closes_at, created_by)
  on public.events to authenticated;
grant update (city_id, title, description, cover_image_url, venue_name, venue_address, maps_url,
              starts_at, ends_at, capacity, pricing, price, waitlist_enabled,
              registration_closes_at, status)
  on public.events to authenticated;

-- registrations, payments, notifications: read-only from the browser.
-- platform_settings: no browser access at all; read on the server.

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users             enable row level security;
alter table public.cities            enable row level security;
alter table public.categories        enable row level security;
alter table public.communities       enable row level security;
alter table public.community_hosts   enable row level security;
alter table public.community_members enable row level security;
alter table public.events            enable row level security;
alter table public.registrations     enable row level security;
alter table public.payments          enable row level security;
alter table public.notifications     enable row level security;
alter table public.platform_settings enable row level security;

-- users
create policy users_select_self_or_admin on public.users
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy users_update_self on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- cities / categories
create policy cities_select on public.cities
  for select to anon, authenticated
  using (is_active or public.is_admin());
create policy categories_select on public.categories
  for select to anon, authenticated
  using (is_active or public.is_admin());

-- communities: UNLISTED ones are readable by link; discovery filters PUBLIC.
create policy communities_select on public.communities
  for select to anon, authenticated
  using (status = 'ACTIVE' or public.is_community_host(id) or public.is_admin());
create policy communities_insert_organizer on public.communities
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and public.current_user_role() in ('ORGANIZER', 'ADMIN')
  );
create policy communities_update_host on public.communities
  for update to authenticated
  using (public.is_community_host(id))
  with check (public.is_community_host(id));

-- community_hosts
create policy community_hosts_select on public.community_hosts
  for select to authenticated
  using (public.is_community_host(community_id) or public.is_admin());
create policy community_hosts_insert_owner on public.community_hosts
  for insert to authenticated
  with check (public.is_community_owner(community_id) and role = 'CO_HOST');
create policy community_hosts_delete_owner on public.community_hosts
  for delete to authenticated
  using (public.is_community_owner(community_id) and role = 'CO_HOST');

-- community_members
create policy community_members_select on public.community_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_community_host(community_id) or public.is_admin());
create policy community_members_join_self on public.community_members
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.communities c where c.id = community_id and c.status = 'ACTIVE')
  );
-- members may leave/rejoin (unless banned); hosts may ban and unban
create policy community_members_update on public.community_members
  for update to authenticated
  using ((user_id = (select auth.uid()) and status <> 'BANNED') or public.is_community_host(community_id))
  with check (
    (user_id = (select auth.uid()) and status in ('ACTIVE', 'LEFT'))
    or public.is_community_host(community_id)
  );

-- events: drafts are visible to hosts only
create policy events_select on public.events
  for select to anon, authenticated
  using (
    (status <> 'DRAFT'
      and exists (select 1 from public.communities c where c.id = community_id and c.status = 'ACTIVE'))
    or public.is_community_host(community_id)
    or public.is_admin()
  );
create policy events_insert_host on public.events
  for insert to authenticated
  with check (public.is_community_host(community_id) and created_by = (select auth.uid()));
create policy events_update_host on public.events
  for update to authenticated
  using (public.is_community_host(community_id))
  with check (public.is_community_host(community_id));

-- registrations: attendees see their own; hosts see their events' guest list
create policy registrations_select on public.registrations
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_event_host(event_id) or public.is_admin());

-- payments: attendees see their own; admins see all (hosts get totals via server)
create policy payments_select on public.payments
  for select to authenticated
  using (
    exists (select 1 from public.registrations r
            where r.id = registration_id and r.user_id = (select auth.uid()))
    or public.is_admin()
  );

-- notifications
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- platform_settings: RLS on, no policies ⇒ only the service role can read/write.

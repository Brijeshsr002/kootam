-- Kootam core schema.
-- Money is stored as INTEGER minor units (paise for INR) — never floats.
-- Event/registration state machines and event capacity are enforced here,
-- not only in app code.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('MEMBER', 'ORGANIZER', 'ADMIN');
create type public.user_status as enum ('ACTIVE', 'SUSPENDED');
create type public.community_status as enum ('ACTIVE', 'SUSPENDED');
create type public.community_visibility as enum ('PUBLIC', 'UNLISTED');
-- Paid ticketing needs a verified payout account; free events never do.
create type public.payout_status as enum ('NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED');
create type public.host_role as enum ('OWNER', 'CO_HOST');
create type public.membership_status as enum ('ACTIVE', 'LEFT', 'BANNED');
create type public.event_status as enum ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');
-- FREE: no money. PAID: ticket price. DEPOSIT: refunded after check-in (kills no-shows).
create type public.event_pricing as enum ('FREE', 'PAID', 'DEPOSIT');
create type public.registration_status as enum (
  'PENDING_PAYMENT', 'CONFIRMED', 'WAITLISTED', 'CANCELLED', 'CHECKED_IN', 'NO_SHOW'
);
create type public.registration_payment_status as enum ('NOT_REQUIRED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED');
create type public.payment_status as enum ('CREATED', 'CAPTURED', 'FAILED');
create type public.refund_status as enum ('NONE', 'PENDING', 'PROCESSED', 'FAILED');
create type public.notification_channel as enum ('EMAIL', 'SMS', 'WHATSAPP', 'IN_APP');
create type public.notification_status as enum ('PENDING', 'SENT', 'FAILED');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Trusted server code (service role) and migrations.
create function public.is_privileged()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('service_role', 'postgres', 'supabase_admin');
$$;

-- ---------------------------------------------------------------------------
-- users — one row per auth.users row (created by trigger in the auth migration)
-- ---------------------------------------------------------------------------
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  phone       text,
  name        text check (char_length(name) <= 120),
  role        public.user_role not null default 'MEMBER',
  avatar_url  text,
  status      public.user_status not null default 'ACTIVE',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index users_role_idx on public.users (role);
create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- cities — launch cities are data, not code
-- ---------------------------------------------------------------------------
create table public.cities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  state       text not null,
  country     text not null default 'India',
  timezone    text not null default 'Asia/Kolkata',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- categories — running, pickleball, trekking, book clubs…
-- ---------------------------------------------------------------------------
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description  text,
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- communities — a run club, a pickleball group, a trek club
-- Live immediately (no approval queue: friction kills adoption).
-- Paid events additionally need payout_status = VERIFIED.
-- ---------------------------------------------------------------------------
create table public.communities (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references public.users (id) on delete restrict,
  category_id         uuid not null references public.categories (id),
  city_id             uuid not null references public.cities (id),
  name                text not null check (char_length(name) between 2 and 80),
  slug                text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  tagline             text check (char_length(tagline) <= 140),
  description         text check (char_length(description) <= 4000),
  logo_url            text,
  cover_image_url     text,
  instagram_handle    text check (instagram_handle ~ '^[A-Za-z0-9._]{1,30}$'),
  whatsapp_group_url  text check (whatsapp_group_url ~ '^https://chat\.whatsapp\.com/'),
  visibility          public.community_visibility not null default 'PUBLIC',
  status              public.community_status not null default 'ACTIVE',
  payout_status       public.payout_status not null default 'NOT_STARTED',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index communities_owner_idx on public.communities (owner_id);
create index communities_discovery_idx on public.communities (city_id, category_id, status, visibility);
create trigger communities_updated_at before update on public.communities
  for each row execute function public.set_updated_at();

-- Status, payout verification and ownership belong to admins / the payouts flow.
create function public.enforce_community_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'ACTIVE' or new.payout_status <> 'NOT_STARTED' then
      raise exception 'New communities start ACTIVE with no payouts' using errcode = 'check_violation';
    end if;
  elsif new.status is distinct from old.status
     or new.payout_status is distinct from old.payout_status
     or new.owner_id is distinct from old.owner_id then
    raise exception 'Only admins can change status, payouts or ownership' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
create trigger communities_enforce_rules before insert or update on public.communities
  for each row execute function public.enforce_community_rules();

-- ---------------------------------------------------------------------------
-- community_hosts — who may manage a community (owner + co-hosts)
-- ---------------------------------------------------------------------------
create table public.community_hosts (
  community_id  uuid not null references public.communities (id) on delete cascade,
  user_id       uuid not null references public.users (id) on delete cascade,
  role          public.host_role not null default 'CO_HOST',
  created_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index community_hosts_user_idx on public.community_hosts (user_id);
create unique index community_hosts_one_owner on public.community_hosts (community_id) where role = 'OWNER';

-- The owner is always a host.
create function public.add_owner_as_host()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.community_hosts (community_id, user_id, role)
  values (new.id, new.owner_id, 'OWNER');
  return new;
end;
$$;
create trigger communities_add_owner_host after insert on public.communities
  for each row execute function public.add_owner_as_host();

-- ---------------------------------------------------------------------------
-- community_members — people who joined a community
-- ---------------------------------------------------------------------------
create table public.community_members (
  community_id  uuid not null references public.communities (id) on delete cascade,
  user_id       uuid not null references public.users (id) on delete cascade,
  status        public.membership_status not null default 'ACTIVE',
  joined_at     timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index community_members_user_idx on public.community_members (user_id);
create trigger community_members_updated_at before update on public.community_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table public.events (
  id                      uuid primary key default gen_random_uuid(),
  community_id            uuid not null references public.communities (id) on delete restrict,
  city_id                 uuid not null references public.cities (id),
  title                   text not null check (char_length(title) between 3 and 120),
  slug                    text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  description             text check (char_length(description) <= 6000),
  cover_image_url         text,
  venue_name              text check (char_length(venue_name) <= 120),
  venue_address           text check (char_length(venue_address) <= 300),
  maps_url                text check (maps_url ~ '^https://'),
  starts_at               timestamptz not null,
  ends_at                 timestamptz not null,
  capacity                integer check (capacity between 1 and 10000), -- null = unlimited
  pricing                 public.event_pricing not null default 'FREE',
  price                   integer not null default 0 check (price between 0 and 10000000), -- paise, ≤ ₹1,00,000
  waitlist_enabled        boolean not null default true,
  registration_closes_at  timestamptz,
  status                  public.event_status not null default 'DRAFT',
  published_at            timestamptz,
  cancelled_reason        text check (char_length(cancelled_reason) <= 500),
  created_by              uuid references public.users (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (community_id, slug),
  check (ends_at > starts_at),
  check ((pricing = 'FREE') = (price = 0)),
  check (registration_closes_at is null or registration_closes_at <= ends_at)
);
create index events_community_idx on public.events (community_id, starts_at);
create index events_discovery_idx on public.events (city_id, status, starts_at);
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- registrations — one person's ticket/RSVP for one event
-- ---------------------------------------------------------------------------
create function public.generate_ticket_number()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'KT-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-' ||
         upper(substr(md5(gen_random_uuid()::text), 1, 6));
$$;

create table public.registrations (
  id                       uuid primary key default gen_random_uuid(),
  event_id                 uuid not null references public.events (id) on delete restrict,
  user_id                  uuid not null references public.users (id) on delete restrict,
  ticket_number            text not null unique default public.generate_ticket_number(),
  -- secret in the attendee's QR code; hosts scan it to check in (2 × 122 random bits)
  check_in_token           text not null unique
                           default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  status                   public.registration_status not null,
  -- money snapshot at registration time, so later setting changes never
  -- rewrite historical revenue
  ticket_amount            integer not null default 0 check (ticket_amount >= 0), -- paise, owed to the organiser
  platform_fee             integer not null default 0 check (platform_fee >= 0),  -- paise, Kootam's revenue
  total_amount             integer not null default 0 check (total_amount >= 0),  -- what the attendee pays
  platform_fee_percentage  numeric(5, 2) not null default 0 check (platform_fee_percentage between 0 and 100),
  payment_status           public.registration_payment_status not null default 'NOT_REQUIRED',
  hold_expires_at          timestamptz, -- PENDING_PAYMENT seats are held only until this time
  checked_in_at            timestamptz,
  checked_in_by            uuid references public.users (id) on delete set null,
  cancelled_at             timestamptz,
  cancellation_reason      text check (char_length(cancellation_reason) <= 500),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (total_amount = ticket_amount + platform_fee),
  check (status <> 'PENDING_PAYMENT' or hold_expires_at is not null),
  check ((status = 'CHECKED_IN') = (checked_in_at is not null))
);
create index registrations_event_idx on public.registrations (event_id, status);
create index registrations_user_idx on public.registrations (user_id);
-- waitlist order = created_at among WAITLISTED rows
create index registrations_waitlist_idx on public.registrations (event_id, created_at) where status = 'WAITLISTED';
-- One live registration per person per event, whatever the application does.
create unique index registrations_one_live_per_user
  on public.registrations (event_id, user_id)
  where status in ('PENDING_PAYMENT', 'CONFIRMED', 'WAITLISTED', 'CHECKED_IN', 'NO_SHOW');
create trigger registrations_updated_at before update on public.registrations
  for each row execute function public.set_updated_at();

-- Seats taken = confirmed/attended + payment holds that have not expired.
-- VOLATILE on purpose: after waiting on the event row lock it must take a
-- fresh snapshot, or it would miss the seat that was just committed.
create function public.event_seats_taken(target_event_id uuid)
returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  select count(*)::integer from public.registrations r
  where r.event_id = target_event_id
    and (
      r.status in ('CONFIRMED', 'CHECKED_IN', 'NO_SHOW')
      or (r.status = 'PENDING_PAYMENT' and r.hold_expires_at > now())
    );
$$;

-- Event state machine:
--   DRAFT     → PUBLISHED | CANCELLED
--   PUBLISHED → CANCELLED | COMPLETED
-- Hosts (role "authenticated") may publish and may cancel a DRAFT. Cancelling
-- or completing a PUBLISHED event goes through server code, because it
-- triggers refunds / no-show marking.
create function public.enforce_event_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  privileged boolean := public.is_privileged();
  community record;
  seats integer;
begin
  if tg_op = 'INSERT' and new.status <> 'DRAFT' and not privileged then
    raise exception 'New events start as DRAFT' using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if not (
      (old.status = 'DRAFT'     and new.status in ('PUBLISHED', 'CANCELLED')) or
      (old.status = 'PUBLISHED' and new.status in ('CANCELLED', 'COMPLETED'))
    ) then
      raise exception 'Invalid event transition % -> %', old.status, new.status
        using errcode = 'check_violation';
    end if;
    if not privileged and old.status = 'PUBLISHED' then
      raise exception 'Event transition % -> % requires the server', old.status, new.status
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if new.status = 'PUBLISHED' and (tg_op = 'INSERT' or old.status <> 'PUBLISHED') then
    select status, payout_status into community from public.communities where id = new.community_id;
    if community.status <> 'ACTIVE' then
      raise exception 'Community is suspended' using errcode = 'check_violation';
    end if;
    if new.pricing <> 'FREE' and community.payout_status <> 'VERIFIED' then
      raise exception 'Paid events need a verified payout account' using errcode = 'check_violation';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;

  if tg_op = 'UPDATE' then
    if new.community_id is distinct from old.community_id then
      raise exception 'Events cannot move between communities' using errcode = 'check_violation';
    end if;

    if old.status in ('CANCELLED', 'COMPLETED') and not privileged then
      raise exception 'Event is % and can no longer be edited', old.status using errcode = 'check_violation';
    end if;

    if (new.pricing is distinct from old.pricing or new.price is distinct from old.price)
       and exists (select 1 from public.registrations r where r.event_id = new.id) then
      raise exception 'Price cannot change once people have registered' using errcode = 'check_violation';
    end if;

    if new.capacity is not null and new.capacity is distinct from old.capacity then
      seats := public.event_seats_taken(new.id);
      if new.capacity < seats then
        raise exception 'Capacity cannot go below the % seats already taken', seats using errcode = 'check_violation';
      end if;
    end if;
  end if;

  return new;
end;
$$;
create trigger events_enforce_rules before insert or update on public.events
  for each row execute function public.enforce_event_rules();

-- Registration state machine:
--   PENDING_PAYMENT → CONFIRMED | CANCELLED
--   WAITLISTED      → PENDING_PAYMENT | CONFIRMED | CANCELLED
--   CONFIRMED       → CHECKED_IN | CANCELLED | NO_SHOW
--   CHECKED_IN, NO_SHOW, CANCELLED are terminal (refunds live on payments).
-- Every move into a seat-holding status locks the event row and re-checks
-- capacity, so two people can never take the last seat at the same time.
create function public.enforce_registration_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  ev record;
  takes_seat boolean := new.status in ('PENDING_PAYMENT', 'CONFIRMED');
begin
  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status and not (
      (old.status = 'PENDING_PAYMENT' and new.status in ('CONFIRMED', 'CANCELLED')) or
      (old.status = 'WAITLISTED'      and new.status in ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED')) or
      (old.status = 'CONFIRMED'       and new.status in ('CHECKED_IN', 'CANCELLED', 'NO_SHOW'))
    ) then
      raise exception 'Invalid registration transition % -> %', old.status, new.status
        using errcode = 'check_violation';
    end if;
    if new.event_id is distinct from old.event_id or new.user_id is distinct from old.user_id
       or new.ticket_amount is distinct from old.ticket_amount or new.platform_fee is distinct from old.platform_fee
       or new.check_in_token is distinct from old.check_in_token then
      raise exception 'Registration details are frozen' using errcode = 'check_violation';
    end if;
    -- A live payment hold keeps its seat; a waitlisted person, or one whose
    -- hold already lapsed, has to win a seat again.
    takes_seat := takes_seat and new.status is distinct from old.status and (
      old.status = 'WAITLISTED' or (old.status = 'PENDING_PAYMENT' and old.hold_expires_at <= now())
    );
    if new.status = 'CANCELLED' and new.cancelled_at is null then
      new.cancelled_at := now();
    end if;
  end if;

  -- Lock the event row: serialises every seat claim for this event.
  select status, capacity, pricing, registration_closes_at, starts_at
    into ev from public.events where id = new.event_id for update;

  if tg_op = 'INSERT' then
    if ev.status <> 'PUBLISHED' or now() > coalesce(ev.registration_closes_at, ev.starts_at) then
      raise exception 'Registrations are closed for this event' using errcode = 'check_violation';
    end if;
    if new.status not in ('PENDING_PAYMENT', 'CONFIRMED', 'WAITLISTED') then
      raise exception 'New registrations must be pending, confirmed or waitlisted' using errcode = 'check_violation';
    end if;
    if ev.pricing <> 'FREE' and new.status = 'CONFIRMED' then
      raise exception 'Paid registrations are confirmed by payment' using errcode = 'check_violation';
    end if;
  end if;

  -- The message is matched by the API layer to answer "event full" (409).
  if takes_seat and ev.capacity is not null and public.event_seats_taken(new.event_id) >= ev.capacity then
    raise exception 'EVENT_FULL' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
create trigger registrations_enforce_rules before insert or update on public.registrations
  for each row execute function public.enforce_registration_rules();

-- ---------------------------------------------------------------------------
-- payments — never store card data
-- ---------------------------------------------------------------------------
create table public.payments (
  id                   uuid primary key default gen_random_uuid(),
  registration_id      uuid not null references public.registrations (id) on delete restrict,
  provider             text not null default 'RAZORPAY',
  provider_order_id    text not null unique,
  provider_payment_id  text unique, -- unique ⇒ duplicate webhooks cannot double-apply
  amount               integer not null check (amount >= 0), -- paise
  currency             char(3) not null default 'INR',
  status               public.payment_status not null default 'CREATED',
  refund_status        public.refund_status not null default 'NONE',
  refund_amount        integer not null default 0 check (refund_amount >= 0),
  provider_refund_id   text unique,
  raw_reference        jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (refund_amount <= amount)
);
create index payments_registration_idx on public.payments (registration_id);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (id) on delete cascade,
  registration_id  uuid references public.registrations (id) on delete set null,
  event_id         uuid references public.events (id) on delete set null,
  type             text not null,
  channel          public.notification_channel not null,
  status           public.notification_status not null default 'PENDING',
  message          text,
  sent_at          timestamptz,
  created_at       timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id);

-- ---------------------------------------------------------------------------
-- platform_settings — business rules are configuration, not code
-- ---------------------------------------------------------------------------
create table public.platform_settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function public.set_updated_at();

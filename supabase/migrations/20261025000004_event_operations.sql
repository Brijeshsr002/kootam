-- Event operations: registration, waitlist, cancellation, check-in, completion.
--
-- Each function is SECURITY DEFINER and checks the caller (auth.uid()) itself,
-- so the browser can call them directly while every rule stays in the
-- database. Errors are raised with a stable code as the message; the API
-- layer maps them to friendly text (lib/events/errors.ts).
-- Paid tickets are handled in the payments phase: these functions refuse them.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.setting_int(setting_key text, fallback integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (value #>> '{}')::integer from public.platform_settings where key = setting_key),
    fallback
  );
$$;

create function public.require_active_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.users where id = uid and status = 'ACTIVE') then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = 'insufficient_privilege';
  end if;
  return uid;
end;
$$;

-- Fill free seats from the waitlist, oldest first. Free events only for now;
-- paid waitlist offers arrive with payments.
create function public.promote_waitlist(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev record;
  next_id uuid;
  promoted integer := 0;
begin
  select status, pricing, capacity into ev from public.events where id = p_event_id;
  if not found or ev.status <> 'PUBLISHED' or ev.pricing <> 'FREE' then
    return 0;
  end if;

  loop
    exit when ev.capacity is not null and public.event_seats_taken(p_event_id) >= ev.capacity;
    select r.id into next_id
      from public.registrations r
     where r.event_id = p_event_id and r.status = 'WAITLISTED'
     order by r.created_at
     limit 1;
    exit when not found;
    update public.registrations set status = 'CONFIRMED' where id = next_id;
    promoted := promoted + 1;
  end loop;

  return promoted;
end;
$$;

-- More seats → promote people waiting.
create function public.events_capacity_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.capacity is null or (old.capacity is not null and new.capacity > old.capacity) then
    perform public.promote_waitlist(new.id);
  end if;
  return null;
end;
$$;
create trigger events_after_capacity_change
  after update of capacity on public.events
  for each row when (new.capacity is distinct from old.capacity)
  execute function public.events_capacity_changed();

-- ---------------------------------------------------------------------------
-- Attendee actions
-- ---------------------------------------------------------------------------

-- One tap: confirmed if a seat is free, waitlisted if full (and the waitlist is
-- on). Calling it again returns the existing ticket. Joins the community too.
create function public.register_for_event(p_event_id uuid)
returns public.registrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_active_user();
  ev record;
  result public.registrations;
begin
  select e.id, e.status, e.pricing, e.waitlist_enabled, e.community_id, c.status as community_status
    into ev
    from public.events e join public.communities c on c.id = e.community_id
   where e.id = p_event_id;
  if not found or ev.status <> 'PUBLISHED' or ev.community_status <> 'ACTIVE' then
    raise exception 'REGISTRATION_CLOSED' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.community_members m
              where m.community_id = ev.community_id and m.user_id = uid and m.status = 'BANNED') then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;
  if ev.pricing <> 'FREE' then
    raise exception 'PAYMENT_REQUIRED' using errcode = 'check_violation';
  end if;

  select * into result from public.registrations r
   where r.event_id = p_event_id and r.user_id = uid
     and r.status in ('PENDING_PAYMENT', 'CONFIRMED', 'WAITLISTED', 'CHECKED_IN', 'NO_SHOW');
  if found then
    return result;
  end if;

  begin
    insert into public.registrations (event_id, user_id, status)
    values (p_event_id, uid, 'CONFIRMED')
    returning * into result;
  exception
    when check_violation then
      if sqlerrm = 'EVENT_FULL' and ev.waitlist_enabled then
        insert into public.registrations (event_id, user_id, status)
        values (p_event_id, uid, 'WAITLISTED')
        returning * into result;
      elsif sqlerrm = 'EVENT_FULL' then
        raise exception 'EVENT_FULL' using errcode = 'check_violation';
      else
        raise;
      end if;
    when unique_violation then
      -- a double tap raced us; hand back the ticket that won
      select * into result from public.registrations r
       where r.event_id = p_event_id and r.user_id = uid
         and r.status in ('PENDING_PAYMENT', 'CONFIRMED', 'WAITLISTED', 'CHECKED_IN', 'NO_SHOW');
  end;

  insert into public.community_members (community_id, user_id)
  values (ev.community_id, uid)
  on conflict (community_id, user_id) do update
    set status = 'ACTIVE'
    where public.community_members.status = 'LEFT';

  return result;
end;
$$;

-- Attendees can leave the waitlist any time, and give up a confirmed seat
-- until the cancel cutoff. The seat goes to the next person waiting.
create function public.cancel_my_registration(p_registration_id uuid)
returns public.registrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_active_user();
  reg record;
  result public.registrations;
  cutoff integer := public.setting_int('attendee_cancel_cutoff_minutes', 180);
begin
  select r.id, r.user_id, r.status, r.payment_status, r.event_id, e.starts_at
    into reg
    from public.registrations r join public.events e on e.id = r.event_id
   where r.id = p_registration_id
     for update of r;
  if not found or reg.user_id <> uid then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;
  if reg.status not in ('CONFIRMED', 'WAITLISTED', 'PENDING_PAYMENT') then
    raise exception 'CANNOT_CANCEL' using errcode = 'check_violation';
  end if;
  if reg.payment_status = 'PAID' then
    raise exception 'REFUND_REQUIRED' using errcode = 'check_violation';
  end if;
  if reg.status = 'CONFIRMED' and now() > reg.starts_at - make_interval(mins => cutoff) then
    raise exception 'CANCEL_WINDOW_CLOSED' using errcode = 'check_violation';
  end if;

  update public.registrations
     set status = 'CANCELLED', cancellation_reason = 'Cancelled by attendee'
   where id = p_registration_id
  returning * into result;

  perform public.promote_waitlist(reg.event_id);
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Host actions
-- ---------------------------------------------------------------------------

create function public.check_in_registration_row(p_registration_id uuid, p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_active_user();
  reg record;
begin
  select r.id, r.event_id, r.status, r.ticket_number, r.checked_in_at, u.name, e.status as event_status, e.title
    into reg
    from public.registrations r
    join public.events e on e.id = r.event_id
    join public.users u on u.id = r.user_id
   where r.id = p_registration_id
     for update of r;
  if not found then
    return jsonb_build_object('result', 'TICKET_NOT_FOUND');
  end if;
  if not public.is_event_host(reg.event_id) then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;

  if p_event_id is not null and p_event_id <> reg.event_id then
    return jsonb_build_object('result', 'WRONG_EVENT', 'name', reg.name, 'event_title', reg.title);
  end if;
  if reg.status = 'CHECKED_IN' then
    return jsonb_build_object('result', 'ALREADY_CHECKED_IN', 'name', reg.name,
                              'ticket_number', reg.ticket_number, 'checked_in_at', reg.checked_in_at,
                              'event_id', reg.event_id);
  end if;
  if reg.status <> 'CONFIRMED' or reg.event_status <> 'PUBLISHED' then
    return jsonb_build_object('result', 'NOT_CONFIRMED', 'name', reg.name, 'status', reg.status,
                              'event_id', reg.event_id);
  end if;

  update public.registrations
     set status = 'CHECKED_IN', checked_in_at = now(), checked_in_by = uid
   where id = reg.id;
  return jsonb_build_object('result', 'CHECKED_IN', 'name', reg.name, 'ticket_number', reg.ticket_number,
                            'event_id', reg.event_id);
end;
$$;

-- The attendee's QR code opens /check-in/<token>; a host who scans it with any
-- phone camera lands there and this checks the person in.
create function public.host_check_in(p_token text, p_event_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  reg_id uuid;
begin
  perform public.require_active_user();
  select id into reg_id from public.registrations where check_in_token = p_token;
  if not found then
    return jsonb_build_object('result', 'TICKET_NOT_FOUND');
  end if;
  return public.check_in_registration_row(reg_id, p_event_id);
end;
$$;

create function public.host_check_in_registration(p_registration_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.check_in_registration_row(p_registration_id, null);
$$;

-- Guest list with names (users' profiles are otherwise private).
create function public.event_guest_list(p_event_id uuid)
returns table (
  registration_id uuid,
  name text,
  status public.registration_status,
  ticket_number text,
  checked_in_at timestamptz,
  registered_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_active_user();
  if not public.is_event_host(p_event_id) then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;
  return query
    select r.id, coalesce(u.name, 'Guest'), r.status, r.ticket_number, r.checked_in_at, r.created_at
      from public.registrations r join public.users u on u.id = r.user_id
     where r.event_id = p_event_id and r.status <> 'CANCELLED'
     order by case r.status when 'WAITLISTED' then 1 else 0 end, r.created_at;
end;
$$;

-- After the event: confirmed people who never checked in become no-shows;
-- anyone still waiting is released.
create function public.host_complete_event(p_event_id uuid)
returns public.events
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev public.events;
begin
  perform public.require_active_user();
  select * into ev from public.events where id = p_event_id for update;
  if not found or not public.is_community_host(ev.community_id) then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;
  if ev.status <> 'PUBLISHED' then
    raise exception 'INVALID_STATE' using errcode = 'check_violation';
  end if;
  if now() < ev.starts_at then
    raise exception 'EVENT_NOT_STARTED' using errcode = 'check_violation';
  end if;

  update public.registrations set status = 'NO_SHOW' where event_id = p_event_id and status = 'CONFIRMED';
  update public.registrations
     set status = 'CANCELLED', cancellation_reason = 'Event completed'
   where event_id = p_event_id and status in ('WAITLISTED', 'PENDING_PAYMENT');
  update public.events set status = 'COMPLETED' where id = p_event_id returning * into ev;
  return ev;
end;
$$;

-- Cancel a draft or published event and release every ticket.
create function public.host_cancel_event(p_event_id uuid, p_reason text)
returns public.events
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev public.events;
begin
  perform public.require_active_user();
  select * into ev from public.events where id = p_event_id for update;
  if not found or not public.is_community_host(ev.community_id) then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;
  if ev.status not in ('DRAFT', 'PUBLISHED') then
    raise exception 'INVALID_STATE' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.registrations
              where event_id = p_event_id and payment_status = 'PAID'
                and status in ('CONFIRMED', 'PENDING_PAYMENT')) then
    raise exception 'REFUND_REQUIRED' using errcode = 'check_violation';
  end if;

  update public.registrations
     set status = 'CANCELLED', cancellation_reason = 'Event cancelled by the host'
   where event_id = p_event_id and status in ('CONFIRMED', 'WAITLISTED', 'PENDING_PAYMENT');
  update public.events
     set status = 'CANCELLED', cancelled_reason = left(nullif(trim(p_reason), ''), 500)
   where id = p_event_id
  returning * into ev;
  return ev;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public counters (no personal data)
-- ---------------------------------------------------------------------------
create function public.event_public_stats(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'seats_taken', (select count(*) from public.registrations r
                     where r.event_id = e.id and r.status in ('CONFIRMED', 'CHECKED_IN', 'NO_SHOW')),
    'waitlisted',  (select count(*) from public.registrations r
                     where r.event_id = e.id and r.status = 'WAITLISTED')
  )
  from public.events e
  where e.id = p_event_id and (e.status <> 'DRAFT' or public.is_community_host(e.community_id));
$$;

create function public.community_member_count(p_community_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.community_members
   where community_id = p_community_id and status = 'ACTIVE';
$$;

-- ---------------------------------------------------------------------------
-- Admin actions
-- ---------------------------------------------------------------------------
create function public.admin_set_payout_status(p_community_id uuid, p_status public.payout_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;
  update public.communities set payout_status = p_status where id = p_community_id;
end;
$$;

create function public.admin_set_community_status(p_community_id uuid, p_status public.community_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;
  update public.communities set status = p_status where id = p_community_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------
revoke execute on function public.setting_int(text, integer) from public, anon, authenticated;
revoke execute on function public.require_active_user() from public, anon, authenticated;
revoke execute on function public.promote_waitlist(uuid) from public, anon, authenticated;
revoke execute on function public.events_capacity_changed() from public, anon, authenticated;
revoke execute on function public.check_in_registration_row(uuid, uuid) from public, anon, authenticated;

revoke execute on function public.register_for_event(uuid) from public, anon;
revoke execute on function public.cancel_my_registration(uuid) from public, anon;
revoke execute on function public.host_check_in(text, uuid) from public, anon;
revoke execute on function public.host_check_in_registration(uuid) from public, anon;
revoke execute on function public.event_guest_list(uuid) from public, anon;
revoke execute on function public.host_complete_event(uuid) from public, anon;
revoke execute on function public.host_cancel_event(uuid, text) from public, anon;
revoke execute on function public.admin_set_payout_status(uuid, public.payout_status) from public, anon;
revoke execute on function public.admin_set_community_status(uuid, public.community_status) from public, anon;
grant execute on function public.register_for_event(uuid) to authenticated;
grant execute on function public.cancel_my_registration(uuid) to authenticated;
grant execute on function public.host_check_in(text, uuid) to authenticated;
grant execute on function public.host_check_in_registration(uuid) to authenticated;
grant execute on function public.event_guest_list(uuid) to authenticated;
grant execute on function public.host_complete_event(uuid) to authenticated;
grant execute on function public.host_cancel_event(uuid, text) to authenticated;
grant execute on function public.admin_set_payout_status(uuid, public.payout_status) to authenticated;
grant execute on function public.admin_set_community_status(uuid, public.community_status) to authenticated;

grant execute on function public.event_public_stats(uuid) to anon, authenticated;
grant execute on function public.community_member_count(uuid) to anon, authenticated;

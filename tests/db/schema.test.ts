import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { asRole, asSuperuser, createAuthUser, createTestDb } from "./harness";

let db: PGlite;
let member: string;
let member2: string;
let member3: string;
let organizerA: string;
let organizerB: string;
let admin: string;
let cityId: string;
let categoryId: string;
let communityA: string;

async function one<T>(sql: string, params: unknown[] = []): Promise<T> {
  const res = await db.query<T>(sql, params);
  return res.rows[0];
}

async function count(sql: string, params: unknown[] = []): Promise<number> {
  const res = await db.query(sql, params);
  return res.rows.length;
}

async function rejects(sql: string, params: unknown[], message: RegExp): Promise<void> {
  await expect(db.query(sql, params)).rejects.toThrow(message);
}

let slugCounter = 0;
async function newEvent(
  opts: { communityId?: string; capacity?: number | null; pricing?: "FREE" | "PAID" | "DEPOSIT"; price?: number; status?: string } = {},
): Promise<string> {
  await asSuperuser(db);
  slugCounter += 1;
  const row = await one<{ id: string }>(
    `insert into public.events (community_id, city_id, title, slug, starts_at, ends_at, capacity, pricing, price, status)
     values ($1, $2, 'Sunday Long Run', $3, now() + interval '2 days', now() + interval '2 days 2 hours', $4, $5, $6, $7)
     returning id`,
    [
      opts.communityId ?? communityA,
      cityId,
      `run-${slugCounter}`,
      opts.capacity === undefined ? null : opts.capacity,
      opts.pricing ?? "FREE",
      opts.price ?? 0,
      opts.status ?? "PUBLISHED",
    ],
  );
  return row.id;
}

async function register(eventId: string, userId: string, status: string, holdMinutes: number | null = null): Promise<string> {
  await asSuperuser(db);
  const row = await one<{ id: string }>(
    `insert into public.registrations (event_id, user_id, status, hold_expires_at)
     values ($1, $2, $3, case when $4::int is null then null else now() + make_interval(mins => $4::int) end)
     returning id`,
    [eventId, userId, status, holdMinutes],
  );
  return row.id;
}

beforeAll(async () => {
  db = await createTestDb();

  member = await createAuthUser(db, { phone: "919800000001" });
  member2 = await createAuthUser(db, { phone: "919800000002" });
  member3 = await createAuthUser(db, { email: "m3@example.com", meta: { full_name: "Mee" } });
  organizerA = await createAuthUser(db, { email: "oa@example.com", meta: { requested_role: "ORGANIZER" } });
  organizerB = await createAuthUser(db, { email: "ob@example.com", meta: { requested_role: "ORGANIZER" } });
  admin = await createAuthUser(db, { email: "admin@example.com" });
  await db.query("update public.users set role = 'ADMIN' where id = $1", [admin]);

  cityId = (await one<{ id: string }>("select id from public.cities where slug = 'coimbatore'")).id;
  categoryId = (await one<{ id: string }>("select id from public.categories where slug = 'running'")).id;

  communityA = (
    await one<{ id: string }>(
      `insert into public.communities (owner_id, category_id, city_id, name, slug)
       values ($1, $2, $3, 'CBE Run Club', 'cbe-run-club') returning id`,
      [organizerA, categoryId, cityId],
    )
  ).id;
});

describe("signup and roles", () => {
  it("creates a profile for every auth user with the requested safe role", async () => {
    await asSuperuser(db);
    expect((await one<{ role: string }>("select role from public.users where id = $1", [member])).role).toBe("MEMBER");
    expect((await one<{ role: string }>("select role from public.users where id = $1", [organizerA])).role).toBe(
      "ORGANIZER",
    );
    expect((await one<{ name: string }>("select name from public.users where id = $1", [member3])).name).toBe("Mee");
  });

  it("never grants ADMIN from signup metadata", async () => {
    const sneaky = await createAuthUser(db, { email: "x@example.com", meta: { requested_role: "ADMIN" } });
    expect((await one<{ role: string }>("select role from public.users where id = $1", [sneaky])).role).toBe("MEMBER");
  });

  it("lets a member become an organiser, but not promote themselves to admin", async () => {
    const u = await createAuthUser(db, { phone: "919800000099" });
    await asRole(db, "authenticated", u);
    expect((await one<{ become_organizer: string }>("select public.become_organizer()")).become_organizer).toBe("ORGANIZER");
    await rejects("select public.admin_set_user_role($1, 'ADMIN')", [u], /Admin only/);
    await rejects("update public.users set role = 'ADMIN' where id = $1", [u], /permission denied/);
  });

  it("users only see their own profile", async () => {
    await asRole(db, "authenticated", member);
    expect(await count("select id from public.users")).toBe(1);
    await asRole(db, "authenticated", admin);
    expect(await count("select id from public.users")).toBeGreaterThan(5);
  });
});

describe("communities", () => {
  it("adds the owner as a host automatically", async () => {
    await asSuperuser(db);
    const host = await one<{ role: string }>(
      "select role from public.community_hosts where community_id = $1 and user_id = $2",
      [communityA, organizerA],
    );
    expect(host.role).toBe("OWNER");
  });

  it("only organisers can create communities, and only for themselves", async () => {
    const insert = `insert into public.communities (owner_id, category_id, city_id, name, slug) values ($1, $2, $3, 'Club X', $4)`;
    await asRole(db, "authenticated", member);
    await rejects(insert, [member, categoryId, cityId, "member-club"], /row-level security/);
    await asRole(db, "authenticated", organizerB);
    await rejects(insert, [organizerA, categoryId, cityId, "fake-owner"], /row-level security/);
    await db.query(insert, [organizerB, categoryId, cityId, "ob-club"]);
  });

  it("organisers cannot verify their own payouts", async () => {
    await asRole(db, "authenticated", organizerA);
    await rejects("update public.communities set payout_status = 'VERIFIED' where id = $1", [communityA], /permission denied/);
  });

  it("other organisers cannot edit a community they do not host", async () => {
    await asRole(db, "authenticated", organizerB);
    const res = await db.query("update public.communities set tagline = 'hacked' where id = $1", [communityA]);
    expect(res.affectedRows).toBe(0);
    await asRole(db, "authenticated", organizerA);
    const ok = await db.query("update public.communities set tagline = 'Run with us' where id = $1", [communityA]);
    expect(ok.affectedRows).toBe(1);
  });

  it("members join themselves, cannot add others, and stay out once banned", async () => {
    await asRole(db, "authenticated", member);
    await db.query("insert into public.community_members (community_id, user_id) values ($1, $2)", [communityA, member]);
    await rejects(
      "insert into public.community_members (community_id, user_id) values ($1, $2)",
      [communityA, member2],
      /row-level security/,
    );

    await asRole(db, "authenticated", organizerA);
    await db.query("update public.community_members set status = 'BANNED' where community_id = $1 and user_id = $2", [
      communityA,
      member,
    ]);
    await asRole(db, "authenticated", member);
    const res = await db.query(
      "update public.community_members set status = 'ACTIVE' where community_id = $1 and user_id = $2",
      [communityA, member],
    );
    expect(res.affectedRows).toBe(0);
  });

  it("hosts see their member list; strangers do not", async () => {
    await asRole(db, "authenticated", organizerA);
    expect(await count("select user_id from public.community_members where community_id = $1", [communityA])).toBe(1);
    await asRole(db, "authenticated", member2);
    expect(await count("select user_id from public.community_members where community_id = $1", [communityA])).toBe(0);
  });
});

describe("events", () => {
  it("hosts create drafts that only they can see", async () => {
    await asRole(db, "authenticated", organizerA);
    const ev = await one<{ id: string; status: string }>(
      `insert into public.events (community_id, city_id, title, slug, starts_at, ends_at, created_by)
       values ($1, $2, 'Draft run', 'draft-run', now() + interval '1 day', now() + interval '1 day 1 hour', $3)
       returning id, status`,
      [communityA, cityId, organizerA],
    );
    expect(ev.status).toBe("DRAFT");
    await asRole(db, "anon");
    expect(await count("select id from public.events where id = $1", [ev.id])).toBe(0);

    await asRole(db, "authenticated", organizerA);
    const pub = await one<{ status: string; published_at: string | null }>(
      "update public.events set status = 'PUBLISHED' where id = $1 returning status, published_at",
      [ev.id],
    );
    expect(pub.status).toBe("PUBLISHED");
    expect(pub.published_at).not.toBeNull();
    await asRole(db, "anon");
    expect(await count("select id from public.events where id = $1", [ev.id])).toBe(1);
  });

  it("non-hosts cannot create events in someone else's community", async () => {
    await asRole(db, "authenticated", organizerB);
    await rejects(
      `insert into public.events (community_id, city_id, title, slug, starts_at, ends_at, created_by)
       values ($1, $2, 'Intruder', 'intruder', now() + interval '1 day', now() + interval '1 day 1 hour', $3)`,
      [communityA, cityId, organizerB],
      /row-level security/,
    );
  });

  it("paid events need a verified payout account before publishing", async () => {
    const ev = await newEvent({ pricing: "PAID", price: 29900, status: "DRAFT" });
    await asRole(db, "authenticated", organizerA);
    await rejects("update public.events set status = 'PUBLISHED' where id = $1", [ev], /verified payout/);

    await asSuperuser(db);
    await db.query("update public.communities set payout_status = 'VERIFIED' where id = $1", [communityA]);
    await asRole(db, "authenticated", organizerA);
    await db.query("update public.events set status = 'PUBLISHED' where id = $1", [ev]);
  });

  it("free/paid and price must agree", async () => {
    await expect(newEvent({ pricing: "FREE", price: 100 })).rejects.toThrow(/check constraint/);
    await expect(newEvent({ pricing: "PAID", price: 0 })).rejects.toThrow(/check constraint/);
  });

  it("cancelling or completing a published event goes through the server", async () => {
    const ev = await newEvent();
    await asRole(db, "authenticated", organizerA);
    await rejects("update public.events set status = 'CANCELLED' where id = $1", [ev], /requires the server/);
    await rejects("update public.events set status = 'DRAFT' where id = $1", [ev], /Invalid event transition/);
    await asSuperuser(db);
    await db.query("update public.events set status = 'COMPLETED' where id = $1", [ev]);
  });
});

describe("registrations and capacity", () => {
  it("never lets confirmed seats exceed capacity; extra people go on the waitlist", async () => {
    const ev = await newEvent({ capacity: 2 });
    await register(ev, member, "CONFIRMED");
    const second = await register(ev, member2, "CONFIRMED");
    await expect(register(ev, member3, "CONFIRMED")).rejects.toThrow(/EVENT_FULL/);

    const waiting = await register(ev, member3, "WAITLISTED");
    await expect(
      db.query("update public.registrations set status = 'CONFIRMED' where id = $1", [waiting]),
    ).rejects.toThrow(/EVENT_FULL/);

    await db.query("update public.registrations set status = 'CANCELLED' where id = $1", [second]);
    await db.query("update public.registrations set status = 'CONFIRMED' where id = $1", [waiting]);
    const cancelled = await one<{ cancelled_at: string | null }>(
      "select cancelled_at from public.registrations where id = $1",
      [second],
    );
    expect(cancelled.cancelled_at).not.toBeNull();
  });

  it("live payment holds take a seat; expired ones do not", async () => {
    await asSuperuser(db);
    await db.query("update public.communities set payout_status = 'VERIFIED' where id = $1", [communityA]);
    const ev = await newEvent({ capacity: 1, pricing: "DEPOSIT", price: 10000 });

    const lapsed = await register(ev, member, "PENDING_PAYMENT", 15);
    await expect(register(ev, member2, "PENDING_PAYMENT", 15)).rejects.toThrow(/EVENT_FULL/);

    // the first hold lapses, so someone else can take the seat…
    await db.query("update public.registrations set hold_expires_at = now() - interval '1 minute' where id = $1", [lapsed]);
    const fresh = await register(ev, member2, "PENDING_PAYMENT", 15);
    // …and a late payment on the lapsed hold cannot squeeze in
    await expect(
      db.query("update public.registrations set status = 'CONFIRMED', payment_status = 'PAID' where id = $1", [lapsed]),
    ).rejects.toThrow(/EVENT_FULL/);
    // while the live hold confirms normally
    await db.query("update public.registrations set status = 'CONFIRMED', payment_status = 'PAID' where id = $1", [fresh]);
  });

  it("paid registrations are confirmed by payment, never directly, and need a hold", async () => {
    const ev = await newEvent({ pricing: "PAID", price: 29900 });
    await expect(register(ev, member, "CONFIRMED")).rejects.toThrow(/confirmed by payment/);
    await expect(register(ev, member, "PENDING_PAYMENT")).rejects.toThrow(/check constraint/);
  });

  it("one live registration per person per event, but re-registering after cancelling is fine", async () => {
    const ev = await newEvent();
    const first = await register(ev, member, "CONFIRMED");
    await expect(register(ev, member, "CONFIRMED")).rejects.toThrow(/registrations_one_live_per_user/);
    await db.query("update public.registrations set status = 'CANCELLED' where id = $1", [first]);
    await register(ev, member, "CONFIRMED");
  });

  it("closed events take no registrations", async () => {
    const draft = await newEvent({ status: "DRAFT" });
    await expect(register(draft, member, "CONFIRMED")).rejects.toThrow(/closed/);
    const closed = await newEvent();
    await db.query("update public.events set registration_closes_at = now() - interval '1 hour' where id = $1", [closed]);
    await expect(register(closed, member, "CONFIRMED")).rejects.toThrow(/closed/);
  });

  it("enforces the registration state machine and check-in timestamp", async () => {
    const ev = await newEvent();
    const reg = await register(ev, member, "CONFIRMED");
    await expect(
      db.query("update public.registrations set status = 'CHECKED_IN' where id = $1", [reg]),
    ).rejects.toThrow(/check constraint/);
    await db.query("update public.registrations set status = 'CHECKED_IN', checked_in_at = now() where id = $1", [reg]);
    await expect(
      db.query("update public.registrations set status = 'CANCELLED', checked_in_at = null where id = $1", [reg]),
    ).rejects.toThrow(/Invalid registration transition/);
    await expect(
      db.query("update public.registrations set check_in_token = 'guessable' where id = $1", [reg]),
    ).rejects.toThrow(/frozen/);
  });

  it("price is frozen once anyone registers, and capacity cannot drop below seats taken", async () => {
    const ev = await newEvent({ capacity: 5 });
    await register(ev, member, "CONFIRMED");
    await register(ev, member2, "CONFIRMED");
    await rejects("update public.events set pricing = 'PAID', price = 100 where id = $1", [ev], /Price cannot change/);
    await rejects("update public.events set capacity = 1 where id = $1", [ev], /Capacity cannot go below/);
    await db.query("update public.events set capacity = 2 where id = $1", [ev]);
  });

  it("issues unique ticket numbers and unguessable check-in tokens", async () => {
    const ev = await newEvent();
    const reg = await register(ev, member3, "CONFIRMED");
    const row = await one<{ ticket_number: string; check_in_token: string }>(
      "select ticket_number, check_in_token from public.registrations where id = $1",
      [reg],
    );
    expect(row.ticket_number).toMatch(/^KT-\d{6}-[0-9A-F]{6}$/);
    expect(row.check_in_token).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("registration privacy", () => {
  it("attendees see their own tickets, hosts see their guest list, strangers see nothing", async () => {
    const ev = await newEvent();
    await register(ev, member, "CONFIRMED");
    await register(ev, member2, "CONFIRMED");

    await asRole(db, "authenticated", member);
    expect(await count("select id from public.registrations where event_id = $1", [ev])).toBe(1);
    await asRole(db, "authenticated", organizerA);
    expect(await count("select id from public.registrations where event_id = $1", [ev])).toBe(2);
    await asRole(db, "authenticated", organizerB);
    expect(await count("select id from public.registrations where event_id = $1", [ev])).toBe(0);
    await asRole(db, "anon");
    await rejects("select id from public.registrations", [], /permission denied/);
  });

  it("the browser can never write registrations, payments or settings", async () => {
    const ev = await newEvent();
    await asRole(db, "authenticated", member);
    await rejects(
      "insert into public.registrations (event_id, user_id, status) values ($1, $2, 'CONFIRMED')",
      [ev, member],
      /permission denied/,
    );
    await rejects("select key from public.platform_settings", [], /permission denied/);
    await rejects(
      "insert into public.payments (registration_id, provider_order_id, amount) values (gen_random_uuid(), 'o', 1)",
      [],
      /permission denied/,
    );
  });
});

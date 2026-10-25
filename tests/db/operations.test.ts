import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { asRole, asSuperuser, createAuthUser, createTestDb } from "./harness";

let db: PGlite;
let host: string;
let stranger: string;
let admin: string;
let a: string;
let b: string;
let c: string;
let cityId: string;
let communityId: string;

async function one<T>(sql: string, params: unknown[] = []): Promise<T> {
  const res = await db.query<T>(sql, params);
  return res.rows[0];
}

let n = 0;
async function newEvent(opts: { capacity?: number | null; waitlist?: boolean; startsIn?: string } = {}): Promise<string> {
  await asSuperuser(db);
  n += 1;
  const startsIn = opts.startsIn ?? "2 days";
  return (
    await one<{ id: string }>(
      `insert into public.events (community_id, city_id, title, slug, starts_at, ends_at, capacity, waitlist_enabled, status)
       values ($1, $2, 'Morning run', $3, now() + $4::interval, now() + $4::interval + interval '2 hours', $5, $6, 'PUBLISHED')
       returning id`,
      [communityId, cityId, `run-${n}`, startsIn, opts.capacity === undefined ? null : opts.capacity, opts.waitlist ?? true],
    )
  ).id;
}

type Reg = { id: string; status: string; check_in_token: string };

async function registerAs(userId: string, eventId: string): Promise<Reg> {
  await asRole(db, "authenticated", userId);
  return one<Reg>("select id, status, check_in_token from public.register_for_event($1)", [eventId]);
}

async function statusOf(regId: string): Promise<string> {
  await asSuperuser(db);
  return (await one<{ status: string }>("select status from public.registrations where id = $1", [regId])).status;
}

beforeAll(async () => {
  db = await createTestDb();
  host = await createAuthUser(db, { email: "host@example.com", meta: { requested_role: "ORGANIZER", full_name: "Arun" } });
  stranger = await createAuthUser(db, { email: "s@example.com", meta: { requested_role: "ORGANIZER" } });
  admin = await createAuthUser(db, { email: "admin@example.com" });
  a = await createAuthUser(db, { phone: "919800000001", meta: { full_name: "Anu" } });
  b = await createAuthUser(db, { phone: "919800000002", meta: { full_name: "Bala" } });
  c = await createAuthUser(db, { phone: "919800000003", meta: { full_name: "Chitra" } });
  await db.query("update public.users set role = 'ADMIN' where id = $1", [admin]);
  cityId = (await one<{ id: string }>("select id from public.cities where slug = 'coimbatore'")).id;
  const cat = (await one<{ id: string }>("select id from public.categories where slug = 'running'")).id;
  communityId = (
    await one<{ id: string }>(
      `insert into public.communities (owner_id, category_id, city_id, name, slug)
       values ($1, $2, $3, 'CBE Runners', 'cbe-runners') returning id`,
      [host, cat, cityId],
    )
  ).id;
});

describe("register_for_event", () => {
  it("confirms while seats last, then waitlists; repeat taps return the same ticket", async () => {
    const ev = await newEvent({ capacity: 2 });
    const ra = await registerAs(a, ev);
    expect(ra.status).toBe("CONFIRMED");
    expect((await registerAs(a, ev)).id).toBe(ra.id);
    expect((await registerAs(b, ev)).status).toBe("CONFIRMED");
    expect((await registerAs(c, ev)).status).toBe("WAITLISTED");
  });

  it("says EVENT_FULL when the waitlist is off", async () => {
    const ev = await newEvent({ capacity: 1, waitlist: false });
    await registerAs(a, ev);
    await expect(registerAs(b, ev)).rejects.toThrow(/EVENT_FULL/);
  });

  it("joins the attendee to the community", async () => {
    const ev = await newEvent();
    await registerAs(c, ev);
    await asSuperuser(db);
    const m = await one<{ status: string }>(
      "select status from public.community_members where community_id = $1 and user_id = $2",
      [communityId, c],
    );
    expect(m.status).toBe("ACTIVE");
  });

  it("refuses signed-out callers, paid events and closed events", async () => {
    const ev = await newEvent();
    await asRole(db, "anon");
    await expect(db.query("select public.register_for_event($1)", [ev])).rejects.toThrow(/permission denied/);

    await asSuperuser(db);
    await db.query("update public.communities set payout_status = 'VERIFIED' where id = $1", [communityId]);
    const paid = await newEvent();
    await db.query("update public.events set pricing = 'PAID', price = 19900 where id = $1", [paid]);
    await expect(registerAs(a, paid)).rejects.toThrow(/PAYMENT_REQUIRED/);

    const past = await newEvent({ startsIn: "-1 hour" });
    await expect(registerAs(a, past)).rejects.toThrow(/closed/);
  });

  it("keeps banned members out", async () => {
    const ev = await newEvent();
    await asSuperuser(db);
    const banned = await createAuthUser(db, { phone: "919800000009" });
    await db.query("insert into public.community_members (community_id, user_id, status) values ($1, $2, 'BANNED')", [
      communityId,
      banned,
    ]);
    await expect(registerAs(banned, ev)).rejects.toThrow(/FORBIDDEN/);
  });
});

describe("cancel and waitlist promotion", () => {
  it("a cancelled seat goes to the first person waiting", async () => {
    const ev = await newEvent({ capacity: 1 });
    const ra = await registerAs(a, ev);
    const rb = await registerAs(b, ev);
    const rc = await registerAs(c, ev);
    expect(rb.status).toBe("WAITLISTED");

    await asRole(db, "authenticated", a);
    const cancelled = await one<{ status: string }>("select status from public.cancel_my_registration($1)", [ra.id]);
    expect(cancelled.status).toBe("CANCELLED");
    expect(await statusOf(rb.id)).toBe("CONFIRMED");
    expect(await statusOf(rc.id)).toBe("WAITLISTED");
  });

  it("raising capacity promotes people waiting", async () => {
    const ev = await newEvent({ capacity: 1 });
    await registerAs(a, ev);
    const rb = await registerAs(b, ev);
    await asRole(db, "authenticated", host);
    await db.query("update public.events set capacity = 2 where id = $1", [ev]);
    expect(await statusOf(rb.id)).toBe("CONFIRMED");
  });

  it("only the ticket holder can cancel, and not after the cutoff", async () => {
    const ev = await newEvent({ startsIn: "1 hour" }); // cutoff is 3 hours before
    const ra = await registerAs(a, ev);
    await asRole(db, "authenticated", b);
    await expect(db.query("select public.cancel_my_registration($1)", [ra.id])).rejects.toThrow(/NOT_FOUND/);
    await asRole(db, "authenticated", a);
    await expect(db.query("select public.cancel_my_registration($1)", [ra.id])).rejects.toThrow(/CANCEL_WINDOW_CLOSED/);
  });

  it("people can leave the waitlist any time", async () => {
    const ev = await newEvent({ capacity: 1, startsIn: "1 hour" });
    await registerAs(a, ev);
    const rb = await registerAs(b, ev);
    await asRole(db, "authenticated", b);
    await db.query("select public.cancel_my_registration($1)", [rb.id]);
    expect(await statusOf(rb.id)).toBe("CANCELLED");
  });
});

describe("check-in", () => {
  it("hosts check people in by QR token once; repeats are reported, not double-counted", async () => {
    const ev = await newEvent();
    const ra = await registerAs(a, ev);
    await asRole(db, "authenticated", host);
    const first = await one<{ r: { result: string; name: string } }>("select public.host_check_in($1, $2) as r", [
      ra.check_in_token,
      ev,
    ]);
    expect(first.r).toMatchObject({ result: "CHECKED_IN", name: "Anu" });
    const again = await one<{ r: { result: string } }>("select public.host_check_in($1, null) as r", [ra.check_in_token]);
    expect(again.r.result).toBe("ALREADY_CHECKED_IN");
    expect(await statusOf(ra.id)).toBe("CHECKED_IN");
  });

  it("flags unknown tickets, other events and waitlisted people", async () => {
    const ev = await newEvent({ capacity: 1 });
    const other = await newEvent();
    await registerAs(a, ev);
    const rb = await registerAs(b, ev);
    const rOther = await registerAs(c, other);

    await asRole(db, "authenticated", host);
    expect((await one<{ r: { result: string } }>("select public.host_check_in('nope', null) as r")).r.result).toBe(
      "TICKET_NOT_FOUND",
    );
    expect(
      (await one<{ r: { result: string } }>("select public.host_check_in($1, $2) as r", [rOther.check_in_token, ev])).r
        .result,
    ).toBe("WRONG_EVENT");
    expect(
      (await one<{ r: { result: string } }>("select public.host_check_in_registration($1) as r", [rb.id])).r.result,
    ).toBe("NOT_CONFIRMED");
  });

  it("non-hosts cannot check anyone in or read the guest list", async () => {
    const ev = await newEvent();
    const ra = await registerAs(a, ev);
    await asRole(db, "authenticated", stranger);
    await expect(db.query("select public.host_check_in($1, null)", [ra.check_in_token])).rejects.toThrow(/FORBIDDEN/);
    await expect(db.query("select * from public.event_guest_list($1)", [ev])).rejects.toThrow(/FORBIDDEN/);
    await asRole(db, "authenticated", a);
    await expect(db.query("select public.host_check_in($1, null)", [ra.check_in_token])).rejects.toThrow(/FORBIDDEN/);
  });

  it("hosts see names on the guest list, waitlist last", async () => {
    const ev = await newEvent({ capacity: 1 });
    await registerAs(b, ev);
    await registerAs(c, ev);
    await asRole(db, "authenticated", host);
    const rows = (await db.query<{ name: string; status: string }>("select name, status from public.event_guest_list($1)", [ev]))
      .rows;
    expect(rows).toEqual([
      { name: "Bala", status: "CONFIRMED" },
      { name: "Chitra", status: "WAITLISTED" },
    ]);
  });
});

describe("complete and cancel events", () => {
  it("completing marks no-shows and releases the waitlist", async () => {
    const ev = await newEvent({ capacity: 2 });
    const ra = await registerAs(a, ev);
    const rb = await registerAs(b, ev);
    const rc = await registerAs(c, ev);
    await asRole(db, "authenticated", host);
    await db.query("select public.host_check_in_registration($1)", [ra.id]);
    await expect(db.query("select public.host_complete_event($1)", [ev])).rejects.toThrow(/EVENT_NOT_STARTED/);

    await asSuperuser(db);
    await db.query("update public.events set starts_at = now() - interval '3 hours', ends_at = now() - interval '1 hour' where id = $1", [ev]);
    await asRole(db, "authenticated", host);
    const done = await one<{ status: string }>("select status from public.host_complete_event($1)", [ev]);
    expect(done.status).toBe("COMPLETED");
    expect(await statusOf(ra.id)).toBe("CHECKED_IN");
    expect(await statusOf(rb.id)).toBe("NO_SHOW");
    expect(await statusOf(rc.id)).toBe("CANCELLED");
  });

  it("cancelling an event releases every ticket", async () => {
    const ev = await newEvent();
    const ra = await registerAs(a, ev);
    await asRole(db, "authenticated", stranger);
    await expect(db.query("select public.host_cancel_event($1, 'rain')", [ev])).rejects.toThrow(/FORBIDDEN/);
    await asRole(db, "authenticated", host);
    const ended = await one<{ status: string; cancelled_reason: string }>(
      "select status, cancelled_reason from public.host_cancel_event($1, 'Heavy rain')",
      [ev],
    );
    expect(ended).toEqual({ status: "CANCELLED", cancelled_reason: "Heavy rain" });
    expect(await statusOf(ra.id)).toBe("CANCELLED");
  });
});

describe("public stats and admin", () => {
  it("anyone sees seat counts for published events, not drafts", async () => {
    const ev = await newEvent({ capacity: 1 });
    await registerAs(a, ev);
    await registerAs(b, ev);
    await asRole(db, "anon");
    const s = await one<{ s: { seats_taken: number; waitlisted: number } }>("select public.event_public_stats($1) as s", [ev]);
    expect(s.s).toEqual({ seats_taken: 1, waitlisted: 1 });
    expect((await one<{ n: number }>("select public.community_member_count($1) as n", [communityId])).n).toBeGreaterThan(0);

    await asSuperuser(db);
    const draft = (
      await one<{ id: string }>(
        `insert into public.events (community_id, city_id, title, slug, starts_at, ends_at)
         values ($1, $2, 'Secret', 'secret-draft', now() + interval '1 day', now() + interval '1 day 1 hour') returning id`,
        [communityId, cityId],
      )
    ).id;
    await asRole(db, "anon");
    expect((await one<{ s: unknown }>("select public.event_public_stats($1) as s", [draft])).s).toBeNull();
  });

  it("only admins verify payouts or suspend communities", async () => {
    await asRole(db, "authenticated", host);
    await expect(db.query("select public.admin_set_payout_status($1, 'VERIFIED')", [communityId])).rejects.toThrow(
      /FORBIDDEN/,
    );
    await asRole(db, "authenticated", admin);
    await db.query("select public.admin_set_payout_status($1, 'PENDING')", [communityId]);
    await asSuperuser(db);
    expect((await one<{ p: string }>("select payout_status as p from public.communities where id = $1", [communityId])).p).toBe(
      "PENDING",
    );
  });
});

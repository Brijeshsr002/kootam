import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  COMMUNITY_COLUMNS,
  EVENT_COLUMNS,
  type Category,
  type City,
  type Community,
  type EventRow,
  type EventStats,
  type Registration,
} from "./types";

// Reads go through the user's session, so RLS decides what each person sees
// (hosts see their drafts, everyone else only published events).

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !url.includes("YOUR-PROJECT-REF"));
}

export const getCities = cache(async (): Promise<City[]> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("cities").select("id, name, slug").order("name");
  return (data ?? []) as City[];
});

export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("categories").select("id, name, slug").order("sort_order");
  return (data ?? []) as Category[];
});

export const getCommunityBySlug = cache(async (slug: string): Promise<Community | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("communities").select(COMMUNITY_COLUMNS).eq("slug", slug).maybeSingle();
  return (data as Community | null) ?? null;
});

export const getEventBySlug = cache(async (communityId: string, slug: string): Promise<EventRow | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("community_id", communityId)
    .eq("slug", slug)
    .maybeSingle();
  return (data as EventRow | null) ?? null;
});

export async function getEventById(id: string): Promise<EventRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("events").select(EVENT_COLUMNS).eq("id", id).maybeSingle();
  return (data as EventRow | null) ?? null;
}

export async function getEventStats(eventId: string): Promise<EventStats> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("event_public_stats", { p_event_id: eventId });
  return (data as EventStats | null) ?? { seats_taken: 0, waitlisted: 0 };
}

export async function getMemberCount(communityId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("community_member_count", { p_community_id: communityId });
  return typeof data === "number" ? data : 0;
}

export async function listCommunityEvents(
  communityId: string,
  when: "upcoming" | "past",
  opts: { includeDrafts?: boolean; limit?: number } = {},
): Promise<EventRow[]> {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  let q = supabase.from("events").select(EVENT_COLUMNS).eq("community_id", communityId);
  q = when === "upcoming" ? q.gte("ends_at", now).order("starts_at") : q.lt("ends_at", now).order("starts_at", { ascending: false });
  if (!opts.includeDrafts) q = q.neq("status", "DRAFT");
  const { data } = await q.limit(opts.limit ?? 50);
  return (data ?? []) as EventRow[];
}

export type DiscoverEvent = EventRow & { community: Pick<Community, "name" | "slug" | "category_id" | "visibility"> };

/** Upcoming published events from public communities, soonest first. */
export async function listDiscoverEvents(opts: { cityId?: string; categoryId?: string; limit?: number } = {}): Promise<DiscoverEvent[]> {
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("events")
    .select(`${EVENT_COLUMNS}, community:communities!inner(name, slug, category_id, visibility)`)
    .eq("status", "PUBLISHED")
    .eq("community.visibility", "PUBLIC")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at")
    .limit(opts.limit ?? 30);
  if (opts.cityId) q = q.eq("city_id", opts.cityId);
  if (opts.categoryId) q = q.eq("community.category_id", opts.categoryId);
  const { data } = await q;
  return (data ?? []) as unknown as DiscoverEvent[];
}

/** The first community this user hosts (MVP: one community per organiser). */
export async function getHostedCommunity(userId: string): Promise<Community | null> {
  const supabase = await createSupabaseServerClient();
  const { data: hostRows } = await supabase
    .from("community_hosts")
    .select("community_id, created_at")
    .eq("user_id", userId)
    .order("created_at")
    .limit(1);
  const communityId = hostRows?.[0]?.community_id as string | undefined;
  if (!communityId) return null;
  const { data } = await supabase.from("communities").select(COMMUNITY_COLUMNS).eq("id", communityId).maybeSingle();
  return (data as Community | null) ?? null;
}

export async function getMyRegistration(eventId: string, userId: string): Promise<Registration | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("registrations")
    .select("id, event_id, user_id, ticket_number, check_in_token, status, checked_in_at, created_at")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .neq("status", "CANCELLED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Registration | null) ?? null;
}

export type MyTicket = Registration & {
  event: EventRow & { community: Pick<Community, "name" | "slug"> };
};

const LIVE_TICKET = ["CONFIRMED", "WAITLISTED", "CHECKED_IN"];

/** Tickets for events that haven't ended, soonest first. */
export async function listMyUpcomingTickets(userId: string): Promise<MyTicket[]> {
  const now = Date.now();
  return (await listMyTickets(userId))
    .filter((t) => new Date(t.event.ends_at).getTime() >= now && LIVE_TICKET.includes(t.status))
    .sort((a, b) => a.event.starts_at.localeCompare(b.event.starts_at));
}

/** Past events and cancelled tickets, newest first. */
export async function listMyPastTickets(userId: string): Promise<MyTicket[]> {
  const now = Date.now();
  return (await listMyTickets(userId))
    .filter((t) => new Date(t.event.ends_at).getTime() < now || t.status === "CANCELLED")
    .sort((a, b) => b.event.starts_at.localeCompare(a.event.starts_at));
}

/** Published events starting within the next `hours` (or already running). */
export async function listEventsStartingSoon(communityId: string, hours: number): Promise<EventRow[]> {
  const limit = Date.now() + hours * 3600_000;
  return (await listCommunityEvents(communityId, "upcoming")).filter(
    (e) => e.status === "PUBLISHED" && new Date(e.starts_at).getTime() < limit,
  );
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

export async function listMyTickets(userId: string): Promise<MyTicket[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("registrations")
    .select(
      `id, event_id, user_id, ticket_number, check_in_token, status, checked_in_at, created_at,
       event:events!inner(${EVENT_COLUMNS}, community:communities!inner(name, slug))`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as unknown as MyTicket[];
}

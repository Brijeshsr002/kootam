"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { getHostedCommunity } from "@/lib/data/queries";
import { friendlyError } from "@/lib/events/errors";
import { istLocalToIso, slugify } from "@/lib/format";
import { formString, optional, type ActionState } from "@/lib/actions/state";
import { log } from "@/lib/logger";
import type { CheckInResult } from "@/lib/data/types";

// Every action re-checks the caller; RLS and the DB functions check again.

async function requireOrganizer() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/host");
  if (user.status !== "ACTIVE") redirect("/login?error=suspended");
  return user;
}

const communitySchema = z.object({
  name: z.string().min(2, "Name needs at least 2 characters.").max(80),
  slug: z
    .string()
    .min(3, "Link needs at least 3 characters.")
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes."),
  city_id: z.uuid("Pick a city."),
  category_id: z.uuid("Pick a category."),
  tagline: z.string().max(140).nullable(),
  description: z.string().max(4000).nullable(),
  instagram_handle: z
    .string()
    .regex(/^[A-Za-z0-9._]{1,30}$/, "Instagram handle: letters, numbers, dots and underscores only.")
    .nullable(),
  whatsapp_group_url: z
    .string()
    .regex(/^https:\/\/chat\.whatsapp\.com\//, "WhatsApp link must start with https://chat.whatsapp.com/")
    .nullable(),
  visibility: z.enum(["PUBLIC", "UNLISTED"]),
});

function readCommunity(formData: FormData) {
  const name = formString(formData, "name");
  return communitySchema.safeParse({
    name,
    slug: slugify(formString(formData, "slug") || name),
    city_id: formString(formData, "city_id"),
    category_id: formString(formData, "category_id"),
    tagline: optional(formString(formData, "tagline")),
    description: optional(formString(formData, "description")),
    instagram_handle: optional(formString(formData, "instagram_handle").replace(/^@/, "")),
    whatsapp_group_url: optional(formString(formData, "whatsapp_group_url")),
    visibility: formString(formData, "visibility") === "UNLISTED" ? "UNLISTED" : "PUBLIC",
  });
}

export async function createCommunity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireOrganizer();
  const parsed = readCommunity(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const supabase = await createSupabaseServerClient();
  if (user.role === "MEMBER") {
    const { error } = await supabase.rpc("become_organizer");
    if (error) return { error: friendlyError(error.message) };
  }
  const { error } = await supabase.from("communities").insert({ ...parsed.data, owner_id: user.id });
  if (error) {
    log.warn({ action: "COMMUNITY_CREATE", status: "failure", user_id: user.id, error_code: error.code });
    return { error: error.code === "23505" ? "That link is already taken. Try another." : friendlyError(error.message) };
  }
  log.info({ action: "COMMUNITY_CREATED", status: "success", user_id: user.id });
  revalidatePath("/host");
  redirect("/host");
}

export async function updateCommunity(communityId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireOrganizer();
  const parsed = readCommunity(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const fields: Partial<typeof parsed.data> = { ...parsed.data };
  delete fields.slug; // the public link never changes
  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase.from("communities").update(fields, { count: "exact" }).eq("id", communityId);
  if (error) return { error: friendlyError(error.message) };
  if (!count) return { error: "You can't edit this community." };
  revalidatePath("/host", "layout");
  return { ok: "Saved." };
}

const eventSchema = z
  .object({
    title: z.string().min(3, "Title needs at least 3 characters.").max(120),
    description: z.string().max(6000).nullable(),
    venue_name: z.string().max(120).nullable(),
    venue_address: z.string().max(300).nullable(),
    maps_url: z.string().regex(/^https:\/\//, "Maps link must start with https://").nullable(),
    starts_at: z.string({ error: "Pick a start time." }),
    ends_at: z.string({ error: "Pick an end time." }),
    capacity: z.number().int().min(1).max(10000).nullable(),
    waitlist_enabled: z.boolean(),
    registration_closes_at: z.string().nullable(),
  })
  .refine((e) => e.ends_at > e.starts_at, { message: "End time must be after the start." });

function readEvent(formData: FormData) {
  const capacityRaw = formString(formData, "capacity");
  const closes = formString(formData, "registration_closes_at");
  return eventSchema.safeParse({
    title: formString(formData, "title"),
    description: optional(formString(formData, "description")),
    venue_name: optional(formString(formData, "venue_name")),
    venue_address: optional(formString(formData, "venue_address")),
    maps_url: optional(formString(formData, "maps_url")),
    starts_at: istLocalToIso(formString(formData, "starts_at")) ?? undefined,
    ends_at: istLocalToIso(formString(formData, "ends_at")) ?? undefined,
    capacity: capacityRaw === "" ? null : Number(capacityRaw),
    waitlist_enabled: formData.get("waitlist_enabled") === "on",
    registration_closes_at: closes === "" ? null : istLocalToIso(closes),
  });
}

export async function createEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireOrganizer();
  const community = await getHostedCommunity(user.id);
  if (!community) redirect("/host");
  const parsed = readEvent(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const supabase = await createSupabaseServerClient();
  const slug = `${slugify(parsed.data.title, 60) || "event"}-${crypto.randomUUID().slice(0, 4)}`;
  const { data, error } = await supabase
    .from("events")
    .insert({
      ...parsed.data,
      community_id: community.id,
      city_id: community.city_id,
      slug,
      pricing: "FREE",
      price: 0,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return { error: friendlyError(error?.message) };

  if (formString(formData, "intent") === "publish") {
    const { error: pubError } = await supabase.from("events").update({ status: "PUBLISHED" }).eq("id", data.id);
    if (pubError) return { error: friendlyError(pubError.message) };
  }
  log.info({ action: "EVENT_CREATED", status: "success", user_id: user.id, event_id: data.id });
  revalidatePath("/host", "layout");
  redirect(`/host/events/${data.id}`);
}

export async function updateEvent(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireOrganizer();
  const parsed = readEvent(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase.from("events").update(parsed.data, { count: "exact" }).eq("id", eventId);
  if (error) return { error: friendlyError(error.message) };
  if (!count) return { error: "You can't edit this event." };
  revalidatePath("/host", "layout");
  revalidatePath("/c", "layout");
  return { ok: "Saved." };
}

export async function publishEvent(eventId: string): Promise<ActionState> {
  await requireOrganizer();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("events").update({ status: "PUBLISHED" }).eq("id", eventId).eq("status", "DRAFT");
  if (error) return { error: friendlyError(error.message) };
  revalidatePath("/host", "layout");
  return { ok: "Published. Share the link in your group." };
}

export async function cancelEvent(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireOrganizer();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("host_cancel_event", {
    p_event_id: eventId,
    p_reason: formString(formData, "reason"),
  });
  if (error) return { error: friendlyError(error.message) };
  revalidatePath("/host", "layout");
  revalidatePath("/c", "layout");
  return { ok: "Event cancelled. Everyone's ticket was released." };
}

export async function completeEvent(eventId: string): Promise<ActionState> {
  await requireOrganizer();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("host_complete_event", { p_event_id: eventId });
  if (error) return { error: friendlyError(error.message) };
  revalidatePath("/host", "layout");
  return { ok: "Event completed. No-shows are recorded." };
}

export async function checkInGuest(eventId: string, registrationId: string): Promise<CheckInResult | { error: string }> {
  await requireOrganizer();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("host_check_in_registration", { p_registration_id: registrationId });
  if (error) return { error: friendlyError(error.message) };
  revalidatePath(`/host/events/${eventId}`);
  return data as CheckInResult;
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/roles";
import { friendlyError } from "@/lib/events/errors";
import { formString, type ActionState } from "@/lib/actions/state";
import { log } from "@/lib/logger";

async function requireUser(returnTo: string) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (user.status !== "ACTIVE") redirect("/login?error=suspended");
  return user;
}

export async function registerForEvent(eventId: string, returnTo: string): Promise<ActionState> {
  const path = safeNextPath(returnTo);
  const user = await requireUser(path);
  // Hosts need a name on the guest list.
  if (!user.name) redirect(`/me/profile?next=${encodeURIComponent(path)}&need=name`);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("register_for_event", { p_event_id: eventId });
  if (error) {
    log.warn({ action: "REGISTER", status: "failure", user_id: user.id, event_id: eventId, error_code: error.message });
    return { error: friendlyError(error.message) };
  }
  const status = (data as { status?: string } | null)?.status;
  log.info({ action: "REGISTERED", status: "success", user_id: user.id, event_id: eventId, registration_status: status });
  revalidatePath(path);
  revalidatePath("/me");
  return { ok: status === "WAITLISTED" ? "You're on the waitlist. We'll move you up if a spot opens." : "You're in! See your ticket in My tickets." };
}

export async function cancelRegistration(registrationId: string, returnTo: string): Promise<ActionState> {
  const path = safeNextPath(returnTo);
  await requireUser(path);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_my_registration", { p_registration_id: registrationId });
  if (error) return { error: friendlyError(error.message) };
  revalidatePath(path);
  revalidatePath("/me");
  return { ok: "Cancelled. Your spot went to the next person." };
}

export async function joinCommunity(communityId: string, returnTo: string): Promise<ActionState> {
  const path = safeNextPath(returnTo);
  const user = await requireUser(path);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("community_members").insert({ community_id: communityId, user_id: user.id });
  if (error?.code === "23505") {
    // joined before and left: rejoin (RLS refuses this for banned members)
    const { error: rejoinError, count } = await supabase
      .from("community_members")
      .update({ status: "ACTIVE" }, { count: "exact" })
      .eq("community_id", communityId)
      .eq("user_id", user.id);
    if (rejoinError || !count) return { error: "You can't join this community." };
  } else if (error) {
    return { error: friendlyError(error.message) };
  }
  revalidatePath(path);
  return { ok: "Joined." };
}

export async function leaveCommunity(communityId: string, returnTo: string): Promise<ActionState> {
  const path = safeNextPath(returnTo);
  const user = await requireUser(path);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("community_members")
    .update({ status: "LEFT" })
    .eq("community_id", communityId)
    .eq("user_id", user.id);
  if (error) return { error: friendlyError(error.message) };
  revalidatePath(path);
  return { ok: "You left the community." };
}

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/me/profile");
  const name = formString(formData, "name");
  if (name.length < 2 || name.length > 120) return { error: "Enter your name (2–120 characters)." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("users").update({ name }).eq("id", user.id);
  if (error) return { error: friendlyError(error.message) };
  revalidatePath("/", "layout");
  const next = formString(formData, "next");
  if (next) redirect(safeNextPath(next));
  return { ok: "Saved." };
}

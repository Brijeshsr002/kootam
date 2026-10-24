import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { homeForRole, isRole, type Role } from "./roles";

export type SessionUser = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: Role;
  status: "ACTIVE" | "SUSPENDED";
};

/**
 * The signed-in user and their profile, or null. `getUser()` validates the JWT
 * with Supabase Auth, so this is safe for authorization decisions.
 * Cached per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Before Supabase is configured, behave as signed-out instead of crashing every page.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, phone, name, role, status")
    .eq("id", user.id)
    .single();

  if (!profile || !isRole(profile.role)) return null;
  return profile as SessionUser;
});

/** For pages/layouts: redirect to login, or to the user's own area if the role doesn't match. */
export async function requireRole(allowed: readonly Role[], currentPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  if (user.status !== "ACTIVE") redirect("/login?error=suspended");
  if (!allowed.includes(user.role)) redirect(homeForRole(user.role));
  return user;
}

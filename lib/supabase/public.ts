import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Anonymous client with no cookies, for public data in sitemap / OG images,
 * which run outside a user request. Returns null before Supabase is set up.
 */
export function createSupabasePublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("YOUR-PROJECT-REF")) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

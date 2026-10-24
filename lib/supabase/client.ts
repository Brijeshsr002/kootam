import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client. Uses only the public anon key; RLS protects data. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

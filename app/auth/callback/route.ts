import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/roles";
import { log } from "@/lib/logger";

/**
 * OAuth (Google) and email-confirmation links land here with a one-time code.
 * Exchange it for a session cookie, apply the organizer intent, then continue.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), "");

  if (!code) return NextResponse.redirect(new URL("/login?error=auth", origin));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    log.warn({ action: "AUTH_CALLBACK", status: "failure", error_code: "CODE_EXCHANGE_FAILED" });
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  // Google signup from the "I run a community" tab: switch a member account
  // to ORGANIZER. The DB function refuses for suspended accounts.
  if (searchParams.get("intent") === "organizer") {
    const { error: roleError } = await supabase.rpc("become_organizer");
    if (roleError) {
      log.error({ action: "BECOME_ORGANIZER", status: "failure", user_id: data.user.id, error: roleError.message });
    }
  }

  log.info({ action: "USER_SIGNED_IN", status: "success", user_id: data.user.id });
  const target = new URL("/auth/redirect", origin);
  if (next) target.searchParams.set("next", next);
  return NextResponse.redirect(target);
}

import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { areaForPath, canAccessArea, homeForRole, safeNextPath } from "@/lib/auth/roles";

/** After any sign-in: go to `next` if this role may open it, else the role's home. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login?error=auth", origin));
  if (user.status !== "ACTIVE") return NextResponse.redirect(new URL("/login?error=suspended", origin));

  const next = safeNextPath(searchParams.get("next"), "");
  const area = next ? areaForPath(next) : null;
  const allowed = next && (!area || canAccessArea(user.role, area));
  return NextResponse.redirect(new URL(allowed ? next : homeForRole(user.role), origin));
}

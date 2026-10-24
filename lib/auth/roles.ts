// Pure role/route rules — no I/O, so they are unit-tested and shared by
// proxy.ts, layouts and API handlers.

export const ROLES = ["MEMBER", "ORGANIZER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export type Area = "me" | "host" | "admin";

const AREA_PREFIX: Record<Area, string> = {
  me: "/me",
  host: "/host",
  admin: "/admin",
};

// Everyone attends events, so every role has a "me" area. Admins may open
// every area (support work).
const AREA_ROLES: Record<Area, readonly Role[]> = {
  me: ["MEMBER", "ORGANIZER", "ADMIN"],
  host: ["ORGANIZER", "ADMIN"],
  admin: ["ADMIN"],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function homeForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "ORGANIZER":
      return "/host";
    default:
      return "/me";
  }
}

export function areaForPath(pathname: string): Area | null {
  for (const area of Object.keys(AREA_PREFIX) as Area[]) {
    const prefix = AREA_PREFIX[area];
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return area;
  }
  return null;
}

export function canAccessArea(role: Role, area: Area): boolean {
  return AREA_ROLES[area].includes(role);
}

export function rolesForArea(area: Area): readonly Role[] {
  return AREA_ROLES[area];
}

/**
 * Only allow same-site relative redirects after login, so `?next=` cannot be
 * abused to bounce users to another domain.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

import "server-only";
import { ApiError } from "@/lib/api/response";
import { getSessionUser, type SessionUser } from "./session";
import type { Role } from "./roles";

/** For route handlers: returns the user or throws an ApiError (401/403). */
export async function requireApiUser(allowed?: readonly Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError("UNAUTHENTICATED", "Please log in to continue.");
  if (user.status !== "ACTIVE") throw new ApiError("ACCOUNT_SUSPENDED", "Your account is suspended.");
  if (allowed && !allowed.includes(user.role)) {
    throw new ApiError("FORBIDDEN", "You do not have access to this resource.");
  }
  return user;
}

import { withApi } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/api";

// GET /api/me — the signed-in user's profile and role.
export const GET = withApi("GET_ME", async () => {
  const user = await requireApiUser();
  return ok(user);
});

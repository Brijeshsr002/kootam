import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getHostedCommunity } from "./queries";

/** For /host pages: the signed-in organiser and their community (or send them to create one). */
export async function requireHostContext() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/host");
  const community = await getHostedCommunity(user.id);
  return { user, community };
}

export async function requireHostCommunity() {
  const ctx = await requireHostContext();
  if (!ctx.community) redirect("/host");
  return { user: ctx.user, community: ctx.community };
}

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { friendlyError } from "@/lib/events/errors";
import type { ActionState } from "@/lib/actions/state";
import { log } from "@/lib/logger";

type PayoutStatus = "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") throw new Error("FORBIDDEN");
  return user;
}

export async function setPayoutStatus(communityId: string, status: PayoutStatus): Promise<ActionState> {
  const admin = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_payout_status", { p_community_id: communityId, p_status: status });
  if (error) return { error: friendlyError(error.message) };
  log.info({ action: "ADMIN_PAYOUT_STATUS", status: "success", user_id: admin.id, community_id: communityId, payout_status: status });
  revalidatePath("/admin");
  return { ok: `Payouts set to ${status}.` };
}

export async function setCommunityStatus(communityId: string, status: "ACTIVE" | "SUSPENDED"): Promise<ActionState> {
  const admin = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_community_status", { p_community_id: communityId, p_status: status });
  if (error) return { error: friendlyError(error.message) };
  log.info({ action: "ADMIN_COMMUNITY_STATUS", status: "success", user_id: admin.id, community_id: communityId, community_status: status });
  revalidatePath("/admin");
  return { ok: status === "SUSPENDED" ? "Community suspended." : "Community reactivated." };
}

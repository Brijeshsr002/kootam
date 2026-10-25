import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { Badge, dangerButton, secondaryButton } from "@/components/ui";
import { setCommunityStatus, setPayoutStatus } from "@/app/actions/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { COMMUNITY_COLUMNS, type Community } from "@/lib/data/types";
import { daysAgoIso } from "@/lib/data/queries";
import { communityPath } from "@/lib/site";

const small = "rounded-full border border-border px-3 py-1 text-sm";

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();
  const since = daysAgoIso(7);
  const [{ data: communities }, { count: users }, { count: events }, { count: checkIns }] = await Promise.all([
    supabase.from("communities").select(COMMUNITY_COLUMNS).order("created_at", { ascending: false }).limit(200),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }).neq("status", "DRAFT"),
    supabase.from("registrations").select("id", { count: "exact", head: true }).eq("status", "CHECKED_IN").gte("checked_in_at", since),
  ]);
  const list = (communities ?? []) as Community[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform overview</h1>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Communities", list.length],
          ["Users", users ?? 0],
          ["Events", events ?? 0],
          ["Check-ins (7 days)", checkIns ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border p-4">
            <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </section>

      <ul className="divide-y divide-border rounded-xl border border-border">
        {list.map((c) => (
          <li key={c.id} className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={communityPath(c.slug)} className="font-semibold underline">
                {c.name}
              </Link>
              <Badge tone={c.status === "ACTIVE" ? "good" : "bad"}>{c.status}</Badge>
              <Badge tone={c.payout_status === "VERIFIED" ? "good" : c.payout_status === "PENDING" ? "warn" : "neutral"}>
                Payouts: {c.payout_status}
              </Badge>
              <span className="text-xs text-muted">{new Date(c.created_at).toLocaleDateString("en-IN")}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {c.payout_status !== "VERIFIED" && (
                <ActionButton action={setPayoutStatus.bind(null, c.id, "VERIFIED")} className={small} confirm="Verify payouts? Only after checking KYC.">
                  Verify payouts
                </ActionButton>
              )}
              {c.payout_status !== "REJECTED" && c.payout_status !== "NOT_STARTED" && (
                <ActionButton action={setPayoutStatus.bind(null, c.id, "REJECTED")} className={small}>
                  Reject payouts
                </ActionButton>
              )}
              {c.status === "ACTIVE" ? (
                <ActionButton action={setCommunityStatus.bind(null, c.id, "SUSPENDED")} className={dangerButton} confirm="Suspend this community?">
                  Suspend
                </ActionButton>
              ) : (
                <ActionButton action={setCommunityStatus.bind(null, c.id, "ACTIVE")} className={secondaryButton}>
                  Reactivate
                </ActionButton>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

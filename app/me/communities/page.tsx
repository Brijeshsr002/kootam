import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { communityPath } from "@/lib/site";

export default async function MyCommunitiesPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("community_members")
    .select("community:communities!inner(name, slug, tagline)")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE");
  const communities = ((data ?? []) as unknown as { community: { name: string; slug: string; tagline: string | null } }[]).map(
    (r) => r.community,
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My communities</h1>
      {communities.length === 0 ? (
        <EmptyState>You haven&apos;t joined any communities yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {communities.map((c) => (
            <li key={c.slug}>
              <Link href={communityPath(c.slug)} className="block rounded-xl border border-border p-4 hover:border-brand">
                <p className="font-semibold">{c.name}</p>
                {c.tagline && <p className="text-sm text-muted">{c.tagline}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm">
        Run a group yourself?{" "}
        <Link href="/start" className="font-medium text-brand">
          Start a community
        </Link>
      </p>
    </div>
  );
}

import { OG_SIZE, ogCard } from "@/lib/og";
import { formatEventTime } from "@/lib/format";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export const alt = "Event on Kootam";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string; event: string }> }) {
  const { slug, event: eventSlug } = await params;
  const supabase = createSupabasePublicClient();
  type Row = { title: string; starts_at: string; venue_name: string | null; community: { name: string } };
  const { data } = supabase
    ? await supabase
        .from("events")
        .select("title, starts_at, venue_name, community:communities!inner(name, slug)")
        .eq("slug", eventSlug)
        .eq("community.slug", slug)
        .maybeSingle()
    : { data: null };
  const row = data as unknown as Row | null;
  return ogCard({
    eyebrow: row ? formatEventTime(row.starts_at) : "Event",
    title: row?.title ?? "Kootam event",
    footer: row ? `${row.community.name}${row.venue_name ? ` · ${row.venue_name}` : ""}`.slice(0, 70) : "Grab your spot",
  });
}

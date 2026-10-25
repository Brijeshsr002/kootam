import { OG_SIZE, ogCard } from "@/lib/og";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export const alt = "Community on Kootam";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createSupabasePublicClient();
  const { data } = supabase
    ? await supabase.from("communities").select("name, tagline, city:cities(name)").eq("slug", slug).maybeSingle()
    : { data: null };
  const community = data as { name: string; tagline: string | null; city: { name: string } | null } | null;
  return ogCard({
    eyebrow: community?.city?.name ?? "Community",
    title: community?.name ?? "Kootam community",
    footer: community?.tagline?.slice(0, 70) ?? "Join and grab your spot",
  });
}

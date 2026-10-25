import type { MetadataRoute } from "next";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { absoluteUrl, communityPath, eventPath } from "@/lib/site";

// Rebuilt at most hourly; lists public communities and their non-draft events.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/start"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];

  const supabase = createSupabasePublicClient();
  if (!supabase) return staticPages;

  const [{ data: cities }, { data: communities }, { data: events }] = await Promise.all([
    supabase.from("cities").select("slug"),
    supabase.from("communities").select("slug, updated_at").eq("visibility", "PUBLIC").limit(5000),
    supabase
      .from("events")
      .select("slug, updated_at, community:communities!inner(slug, visibility)")
      .eq("community.visibility", "PUBLIC")
      .in("status", ["PUBLISHED", "COMPLETED"])
      .limit(20000),
  ]);

  return [
    ...staticPages,
    ...(cities ?? []).map((c) => ({ url: absoluteUrl(`/discover/${c.slug}`), lastModified: now, changeFrequency: "daily" as const, priority: 0.9 })),
    ...(communities ?? []).map((c) => ({
      url: absoluteUrl(communityPath(c.slug)),
      lastModified: new Date(c.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...((events ?? []) as unknown as { slug: string; updated_at: string; community: { slug: string } }[]).map((e) => ({
      url: absoluteUrl(eventPath(e.community.slug, e.slug)),
      lastModified: new Date(e.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}

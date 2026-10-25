import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { EventCard } from "@/components/event-card";
import { ShareButtons } from "@/components/share-buttons";
import { EmptyState, secondaryButton } from "@/components/ui";
import { joinCommunity, leaveCommunity } from "@/app/actions/attendee";
import { getSessionUser } from "@/lib/auth/session";
import { getCategories, getCities, getCommunityBySlug, getMemberCount, listCommunityEvents } from "@/lib/data/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl, communityPath } from "@/lib/site";

type Props = PageProps<"/c/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const community = await getCommunityBySlug(slug);
  if (!community) return { title: "Community not found", robots: { index: false } };
  const cities = await getCities();
  const city = cities.find((c) => c.id === community.city_id)?.name;
  const description =
    community.tagline ?? `${community.name}${city ? ` in ${city}` : ""}. See upcoming events and grab your spot on Kootam.`;
  return {
    title: city ? `${community.name} · ${city}` : community.name,
    description,
    alternates: { canonical: communityPath(community.slug) },
    openGraph: { type: "website", title: community.name, description, url: communityPath(community.slug) },
    twitter: { card: "summary_large_image", title: community.name, description },
    robots: community.visibility === "UNLISTED" ? { index: false, follow: true } : undefined,
  };
}

export default async function CommunityPage({ params }: Props) {
  const { slug } = await params;
  const community = await getCommunityBySlug(slug);
  if (!community || community.status !== "ACTIVE") notFound();

  const [user, upcoming, past, members, cities, categories] = await Promise.all([
    getSessionUser(),
    listCommunityEvents(community.id, "upcoming"),
    listCommunityEvents(community.id, "past", { limit: 6 }),
    getMemberCount(community.id),
    getCities(),
    getCategories(),
  ]);
  const city = cities.find((c) => c.id === community.city_id);
  const category = categories.find((c) => c.id === community.category_id);
  const path = communityPath(community.slug);

  let membership: string | null = null;
  if (user) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("community_members")
      .select("status")
      .eq("community_id", community.id)
      .eq("user_id", user.id)
      .maybeSingle();
    membership = (data?.status as string | undefined) ?? null;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: community.name,
    description: community.tagline ?? community.description ?? undefined,
    url: absoluteUrl(path),
    location: city ? { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: city.name, addressCountry: "IN" } } : undefined,
    sameAs: community.instagram_handle ? [`https://instagram.com/${community.instagram_handle}`] : undefined,
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="text-sm text-muted">
        {city && <Link href={`/discover/${city.slug}`}>{city.name}</Link>}
        {category && <span> · {category.name}</span>}
      </nav>
      <header className="mt-2 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{community.name}</h1>
        {community.tagline && <p className="text-lg text-muted">{community.tagline}</p>}
        <p className="text-sm text-muted">
          {members} {members === 1 ? "member" : "members"} · {upcoming.length} upcoming {upcoming.length === 1 ? "event" : "events"}
          {community.instagram_handle && (
            <>
              {" · "}
              <a href={`https://instagram.com/${community.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="underline">
                @{community.instagram_handle}
              </a>
            </>
          )}
        </p>
        <div className="flex flex-wrap items-start gap-3">
          {membership === "ACTIVE" ? (
            <ActionButton action={leaveCommunity.bind(null, community.id, path)} className={secondaryButton} confirm="Leave this community?">
              Joined ✓
            </ActionButton>
          ) : membership === "BANNED" ? null : (
            <ActionButton action={joinCommunity.bind(null, community.id, path)}>Join community</ActionButton>
          )}
          <ShareButtons url={absoluteUrl(path)} text={`Join ${community.name} on Kootam`} />
        </div>
        {membership === "ACTIVE" && community.whatsapp_group_url && (
          <a href={community.whatsapp_group_url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-medium text-brand">
            Open the WhatsApp group →
          </a>
        )}
      </header>

      {community.description && <p className="mt-6 max-w-2xl whitespace-pre-line">{community.description}</p>}

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">Upcoming events</h2>
        {upcoming.length === 0 ? (
          <EmptyState>No upcoming events yet. Join to hear about the next one.</EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} communitySlug={community.slug} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold">Past events</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {past.map((e) => (
              <EventCard key={e.id} event={e} communitySlug={community.slug} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

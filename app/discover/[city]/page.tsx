import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/ui";
import { getCategories, getCities, listDiscoverEvents } from "@/lib/data/queries";
import { absoluteUrl } from "@/lib/site";

type Props = PageProps<"/discover/[city]">;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ city: citySlug }, sp] = await Promise.all([params, searchParams]);
  const city = (await getCities()).find((c) => c.slug === citySlug);
  if (!city) return { title: "City not found", robots: { index: false } };
  const category = typeof sp.category === "string" ? (await getCategories()).find((c) => c.slug === sp.category) : undefined;
  const what = category ? category.name : "Run clubs, pickleball, fitness and sports meetups";
  const path = `/discover/${city.slug}${category ? `?category=${category.slug}` : ""}`;
  return {
    title: `${what} in ${city.name}`,
    description: `Find ${what.toLowerCase()} in ${city.name} this week. Free to join: RSVP in one tap, get a QR ticket, show up and meet your people.`,
    alternates: { canonical: path },
    openGraph: { title: `${what} in ${city.name}`, url: path },
  };
}

export default async function DiscoverCity({ params, searchParams }: Props) {
  const [{ city: citySlug }, sp] = await Promise.all([params, searchParams]);
  const [cities, categories] = await Promise.all([getCities(), getCategories()]);
  const city = cities.find((c) => c.slug === citySlug);
  if (!city) notFound();
  const category = typeof sp.category === "string" ? categories.find((c) => c.slug === sp.category) : undefined;
  const events = await listDiscoverEvents({ cityId: city.id, categoryId: category?.id, limit: 60 });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Events in ${city.name}`,
    itemListElement: events.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/c/${e.community.slug}/${e.slug}`),
      name: e.title,
    })),
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <h1 className="text-3xl font-bold tracking-tight">
        {category ? category.name : "What's on"} in {city.name}
      </h1>
      <p className="mt-2 text-muted">Free community events. Tap one, grab your spot, show your QR at the venue.</p>

      <nav aria-label="Cities" className="mt-6 flex flex-wrap gap-2 text-sm">
        {cities.map((c) => (
          <Link
            key={c.id}
            href={`/discover/${c.slug}${category ? `?category=${category.slug}` : ""}`}
            className={`rounded-full border px-3 py-1.5 ${c.id === city.id ? "border-brand bg-orange-50 font-medium text-orange-800" : "border-border"}`}
          >
            {c.name}
          </Link>
        ))}
      </nav>
      <nav aria-label="Categories" className="mt-3 flex flex-wrap gap-2 text-sm">
        <Link href={`/discover/${city.slug}`} className={`rounded-full border px-3 py-1.5 ${!category ? "border-brand font-medium" : "border-border"}`}>
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/discover/${city.slug}?category=${c.slug}`}
            className={`rounded-full border px-3 py-1.5 ${category?.id === c.id ? "border-brand font-medium" : "border-border"}`}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      <section className="mt-8">
        {events.length === 0 ? (
          <EmptyState>
            No events listed here yet. Run a group in {city.name}?{" "}
            <Link href="/start" className="font-medium text-brand">
              Put it on Kootam
            </Link>
            .
          </EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} event={e} communitySlug={e.community.slug} communityName={e.community.name} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

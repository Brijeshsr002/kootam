import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { ShareButtons } from "@/components/share-buttons";
import { Badge, dangerButton, secondaryButton } from "@/components/ui";
import { cancelRegistration, registerForEvent } from "@/app/actions/attendee";
import { getSessionUser } from "@/lib/auth/session";
import { getCities, getCommunityBySlug, getEventBySlug, getEventStats, getMyRegistration } from "@/lib/data/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatEventTime, formatTime } from "@/lib/format";
import { absoluteUrl, communityPath, eventPath } from "@/lib/site";

type Props = PageProps<"/c/[slug]/[event]">;

async function load(slug: string, eventSlug: string) {
  const community = await getCommunityBySlug(slug);
  if (!community) return null;
  const event = await getEventBySlug(community.id, eventSlug);
  if (!event) return null;
  return { community, event };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, event: eventSlug } = await params;
  const found = await load(slug, eventSlug);
  if (!found) return { title: "Event not found", robots: { index: false } };
  const { community, event } = found;
  const when = formatEventTime(event.starts_at);
  const description = `${when}${event.venue_name ? ` at ${event.venue_name}` : ""}. Hosted by ${community.name}. Free. Grab your spot on Kootam.`;
  const path = eventPath(community.slug, event.slug);
  return {
    title: `${event.title} · ${community.name}`,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", title: event.title, description, url: path },
    twitter: { card: "summary_large_image", title: event.title, description },
    robots: community.visibility === "UNLISTED" || event.status === "DRAFT" ? { index: false, follow: false } : undefined,
  };
}

export default async function EventPage({ params }: Props) {
  const { slug, event: eventSlug } = await params;
  const found = await load(slug, eventSlug);
  if (!found || found.community.status !== "ACTIVE") notFound();
  const { community, event } = found;

  const user = await getSessionUser();
  const [stats, mine, cities, isHost] = await Promise.all([
    getEventStats(event.id),
    user ? getMyRegistration(event.id, user.id) : Promise.resolve(null),
    getCities(),
    user
      ? createSupabaseServerClient().then(async (s) => {
          const { data } = await s.from("community_hosts").select("user_id").eq("community_id", community.id).eq("user_id", user.id).maybeSingle();
          return Boolean(data);
        })
      : Promise.resolve(false),
  ]);
  const city = cities.find((c) => c.id === event.city_id);
  const path = eventPath(community.slug, event.slug);
  const url = absoluteUrl(path);

  const spotsLeft = event.capacity === null ? null : Math.max(event.capacity - stats.seats_taken, 0);
  const closesAt = event.registration_closes_at ?? event.starts_at;
  const open = event.status === "PUBLISHED" && new Date(closesAt) > new Date();
  const full = spotsLeft === 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description ?? undefined,
    startDate: event.starts_at,
    endDate: event.ends_at,
    eventStatus: event.status === "CANCELLED" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue_name ?? city?.name ?? "India",
      address: {
        "@type": "PostalAddress",
        streetAddress: event.venue_address ?? undefined,
        addressLocality: city?.name,
        addressCountry: "IN",
      },
    },
    organizer: { "@type": "Organization", name: community.name, url: absoluteUrl(communityPath(community.slug)) },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      url,
      availability: full ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      validFrom: event.starts_at,
    },
    ...(event.capacity ? { maximumAttendeeCapacity: event.capacity, remainingAttendeeCapacity: spotsLeft ?? undefined } : {}),
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href={communityPath(community.slug)} className="text-sm font-medium text-brand">
        ← {community.name}
      </Link>

      <header className="mt-3 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          {formatEventTime(event.starts_at)} – {formatTime(event.ends_at)}
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{event.title}</h1>
        <div className="flex flex-wrap gap-2">
          {event.status === "DRAFT" && <Badge tone="warn">Draft: only hosts can see this</Badge>}
          {event.status === "CANCELLED" && <Badge tone="bad">Cancelled</Badge>}
          {event.status === "COMPLETED" && <Badge>Completed</Badge>}
          <Badge tone="good">Free</Badge>
          {spotsLeft !== null && event.status === "PUBLISHED" && (
            <Badge tone={full ? "bad" : spotsLeft <= 5 ? "warn" : "neutral"}>
              {full ? "Full" : `${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left`}
            </Badge>
          )}
          {stats.waitlisted > 0 && <Badge tone="warn">{stats.waitlisted} on waitlist</Badge>}
        </div>
      </header>

      {event.status === "CANCELLED" && event.cancelled_reason && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">Cancelled: {event.cancelled_reason}</p>
      )}

      <section className="mt-6 rounded-xl border border-border p-4">
        {mine?.status === "CONFIRMED" || mine?.status === "CHECKED_IN" ? (
          <div className="space-y-3">
            <p className="font-semibold text-green-800">{mine.status === "CHECKED_IN" ? "You're checked in ✓" : "You're going ✓"}</p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/me/tickets/${mine.id}`} className="inline-flex items-center rounded-full bg-brand px-5 py-2.5 font-medium text-brand-foreground">
                Show my ticket
              </Link>
              {mine.status === "CONFIRMED" && (
                <ActionButton action={cancelRegistration.bind(null, mine.id, path)} className={dangerButton} confirm="Give up your spot?">
                  Can&apos;t make it
                </ActionButton>
              )}
            </div>
          </div>
        ) : mine?.status === "WAITLISTED" ? (
          <div className="space-y-3">
            <p className="font-semibold text-amber-800">You&apos;re on the waitlist</p>
            <p className="text-sm text-muted">If someone cancels, you move up automatically and your ticket appears in My tickets.</p>
            <ActionButton action={cancelRegistration.bind(null, mine.id, path)} className={secondaryButton}>
              Leave the waitlist
            </ActionButton>
          </div>
        ) : open ? (
          full && !event.waitlist_enabled ? (
            <p className="font-medium">This event is full.</p>
          ) : (
            <ActionButton action={registerForEvent.bind(null, event.id, path)} pendingLabel="Saving your spot…">
              {full ? "Join the waitlist" : user ? "Count me in" : "Log in to join"}
            </ActionButton>
          )
        ) : (
          <p className="font-medium text-muted">Registrations are closed.</p>
        )}
      </section>

      <section className="mt-6 space-y-2">
        {event.venue_name && (
          <p>
            <span className="font-medium">{event.venue_name}</span>
            {event.venue_address && <span className="text-muted"> · {event.venue_address}</span>}
          </p>
        )}
        {event.maps_url && (
          <a href={event.maps_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand">
            Open in Google Maps →
          </a>
        )}
        {event.description && <p className="whitespace-pre-line pt-2">{event.description}</p>}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-semibold">Bring your people</h2>
        <ShareButtons url={url} text={`${event.title}, ${formatEventTime(event.starts_at)}. Join me:`} />
      </section>

      {isHost && (
        <p className="mt-8 text-sm">
          <Link href={`/host/events/${event.id}`} className="font-medium text-brand">
            Manage this event (guest list, check-in) →
          </Link>
        </p>
      )}
    </div>
  );
}

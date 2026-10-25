import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { EmptyState, primaryButton } from "@/components/ui";
import { requireHostCommunity } from "@/lib/data/host";
import { listCommunityEvents } from "@/lib/data/queries";

export default async function HostEventsPage() {
  const { community } = await requireHostCommunity();
  const [upcoming, past] = await Promise.all([
    listCommunityEvents(community.id, "upcoming", { includeDrafts: true }),
    listCommunityEvents(community.id, "past", { includeDrafts: true, limit: 50 }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <Link href="/host/events/new" className={primaryButton}>
          + New event
        </Link>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Upcoming</h2>
        {upcoming.length === 0 ? (
          <EmptyState>Nothing scheduled.</EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} communitySlug={community.slug} href={`/host/events/${e.id}`} />
            ))}
          </div>
        )}
      </section>
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Past</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {past.map((e) => (
              <EventCard key={e.id} event={e} communitySlug={community.slug} href={`/host/events/${e.id}`} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

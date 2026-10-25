import Link from "next/link";
import { CommunityForm } from "@/components/community-form";
import { EventCard } from "@/components/event-card";
import { ShareButtons } from "@/components/share-buttons";
import { EmptyState, primaryButton } from "@/components/ui";
import { createCommunity } from "@/app/actions/host";
import { requireHostContext } from "@/lib/data/host";
import { getCategories, getCities, getMemberCount, listCommunityEvents } from "@/lib/data/queries";
import { absoluteUrl, communityPath } from "@/lib/site";

export default async function HostDashboard() {
  const { community } = await requireHostContext();

  if (!community) {
    const [cities, categories] = await Promise.all([getCities(), getCategories()]);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create your community</h1>
          <p className="text-muted">Your public page, where every event lives. Takes 2 minutes.</p>
        </div>
        <CommunityForm action={createCommunity} cities={cities} categories={categories} submitLabel="Create community" />
      </div>
    );
  }

  const [upcoming, members] = await Promise.all([
    listCommunityEvents(community.id, "upcoming", { includeDrafts: true }),
    getMemberCount(community.id),
  ]);
  const publicUrl = absoluteUrl(communityPath(community.slug));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{community.name}</h1>
          <p className="text-sm text-muted">
            {members} {members === 1 ? "member" : "members"} ·{" "}
            <Link href={communityPath(community.slug)} className="text-brand underline">
              View public page
            </Link>
          </p>
        </div>
        <Link href="/host/events/new" className={primaryButton}>
          + New event
        </Link>
      </div>

      <section className="space-y-2 rounded-xl border border-border p-4">
        <h2 className="font-semibold">Share your community page</h2>
        <p className="text-sm text-muted">Pin it in your WhatsApp group description so new people can join.</p>
        <ShareButtons url={publicUrl} text={`Join ${community.name} on Kootam`} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Upcoming</h2>
        {upcoming.length === 0 ? (
          <EmptyState>
            No upcoming events.{" "}
            <Link href="/host/events/new" className="font-medium text-brand">
              Post your next one
            </Link>{" "}
            and share the link in your group.
          </EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} communitySlug={community.slug} href={`/host/events/${e.id}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { CancelEventForm } from "@/components/cancel-event-form";
import { EventForm } from "@/components/event-form";
import { GuestList } from "@/components/guest-list";
import { ShareButtons } from "@/components/share-buttons";
import { Badge, secondaryButton } from "@/components/ui";
import { cancelEvent, checkInGuest, completeEvent, publishEvent, updateEvent } from "@/app/actions/host";
import { requireHostCommunity } from "@/lib/data/host";
import { getEventById } from "@/lib/data/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatEventTime } from "@/lib/format";
import { absoluteUrl, eventPath } from "@/lib/site";
import type { GuestRow } from "@/lib/data/types";

export default async function ManageEventPage({ params }: PageProps<"/host/events/[id]">) {
  const { id } = await params;
  const { community } = await requireHostCommunity();
  const event = await getEventById(id);
  if (!event || event.community_id !== community.id) notFound();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("event_guest_list", { p_event_id: event.id });
  const guests = (data ?? []) as GuestRow[];

  const going = guests.filter((g) => g.status === "CONFIRMED" || g.status === "CHECKED_IN").length;
  const checkedIn = guests.filter((g) => g.status === "CHECKED_IN").length;
  const noShows = guests.filter((g) => g.status === "NO_SHOW").length;
  const waitlisted = guests.filter((g) => g.status === "WAITLISTED").length;
  const url = absoluteUrl(eventPath(community.slug, event.slug));
  const started = new Date(event.starts_at) <= new Date();
  const editable = event.status === "DRAFT" || event.status === "PUBLISHED";

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link href="/host/events" className="text-sm text-muted">
          ← Events
        </Link>
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{formatEventTime(event.starts_at)}</span>
          {event.status === "DRAFT" && <Badge tone="warn">Draft</Badge>}
          {event.status === "PUBLISHED" && <Badge tone="good">Live</Badge>}
          {event.status === "CANCELLED" && <Badge tone="bad">Cancelled</Badge>}
          {event.status === "COMPLETED" && <Badge>Completed</Badge>}
        </div>
      </div>

      {event.status === "DRAFT" && (
        <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm">Only you can see this draft. Publish it when you&apos;re ready to share.</p>
          <ActionButton action={publishEvent.bind(null, event.id)}>Publish event</ActionButton>
        </section>
      )}

      {event.status === "PUBLISHED" && (
        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="font-semibold">Share the link in your group</h2>
          <p className="break-all text-sm text-muted">{url}</p>
          <ShareButtons url={url} text={`${event.title}, ${formatEventTime(event.starts_at)}. Grab your spot:`} />
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Going", going + (event.capacity ? ` / ${event.capacity}` : "")],
          ["Checked in", String(checkedIn)],
          ["Waitlist", String(waitlisted)],
          ["Show-up", going + noShows > 0 && started ? `${Math.round((checkedIn / (going + noShows)) * 100)}%` : "–"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border p-4">
            <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Guest list</h2>
          {event.status === "PUBLISHED" && (
            <p className="text-xs text-muted">Tip: scan a guest&apos;s QR with your phone camera to check them in.</p>
          )}
        </div>
        <GuestList guests={guests} canCheckIn={event.status === "PUBLISHED"} checkIn={checkInGuest.bind(null, event.id)} />
      </section>

      {event.status === "PUBLISHED" && started && (
        <section className="space-y-2 rounded-xl border border-border p-4">
          <h2 className="font-semibold">Wrap up</h2>
          <p className="text-sm text-muted">Marks everyone who didn&apos;t check in as a no-show and closes the event.</p>
          <ActionButton action={completeEvent.bind(null, event.id)} className={secondaryButton} confirm="Complete this event?">
            Complete event
          </ActionButton>
        </section>
      )}

      {editable && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Edit details</h2>
          <EventForm action={updateEvent.bind(null, event.id)} event={event} />
        </section>
      )}

      {editable && (
        <section className="space-y-3 rounded-xl border border-red-200 p-4">
          <h2 className="font-semibold text-red-700">Cancel event</h2>
          <CancelEventForm action={cancelEvent.bind(null, event.id)} />
        </section>
      )}
    </div>
  );
}

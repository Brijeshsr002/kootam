import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { QrCode } from "@/components/qr-code";
import { dangerButton } from "@/components/ui";
import { cancelRegistration } from "@/app/actions/attendee";
import { getSessionUser } from "@/lib/auth/session";
import { listMyTickets } from "@/lib/data/queries";
import { formatEventTime, formatTime } from "@/lib/format";
import { absoluteUrl, eventPath } from "@/lib/site";

export default async function TicketPage({ params }: PageProps<"/me/tickets/[id]">) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return null;
  const ticket = (await listMyTickets(user.id)).find((t) => t.id === id);
  if (!ticket) notFound();

  const { event } = ticket;
  const showQr = ticket.status === "CONFIRMED" && event.status === "PUBLISHED";
  const path = `/me/tickets/${ticket.id}`;

  return (
    <div className="mx-auto max-w-sm space-y-5 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          {formatEventTime(event.starts_at)} – {formatTime(event.ends_at)}
        </p>
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <p className="text-muted">{event.community.name}</p>
      </div>

      {showQr ? (
        <>
          <QrCode value={absoluteUrl(`/check-in/${ticket.check_in_token}`)} label={`Check-in code for ${event.title}`} />
          <p className="text-sm text-muted">Show this at the venue. The host scans it to check you in.</p>
        </>
      ) : (
        <p className="rounded-xl border border-border p-6 font-medium">
          {event.status === "CANCELLED"
            ? "This event was cancelled."
            : ticket.status === "CHECKED_IN"
              ? "You're checked in. Have fun! 🎉"
              : ticket.status === "WAITLISTED"
                ? "You're on the waitlist. Your QR appears here if a spot opens."
                : ticket.status === "NO_SHOW"
                  ? "Marked as missed."
                  : "This ticket is no longer active."}
        </p>
      )}

      <p className="font-mono text-sm">{ticket.ticket_number}</p>
      {event.venue_name && <p className="text-sm">{event.venue_name}</p>}
      {event.maps_url && (
        <a href={event.maps_url} target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-brand">
          Directions →
        </a>
      )}
      <Link href={eventPath(event.community.slug, event.slug)} className="block text-sm text-muted underline">
        Event page
      </Link>
      {(ticket.status === "CONFIRMED" || ticket.status === "WAITLISTED") && event.status === "PUBLISHED" && (
        <ActionButton action={cancelRegistration.bind(null, ticket.id, path)} className={dangerButton} confirm="Give up your spot?">
          {ticket.status === "WAITLISTED" ? "Leave the waitlist" : "Can't make it"}
        </ActionButton>
      )}
    </div>
  );
}

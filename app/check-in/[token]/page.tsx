import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/events/errors";
import { log } from "@/lib/logger";
import type { CheckInResult } from "@/lib/data/types";

export const metadata: Metadata = { title: "Check-in", robots: { index: false, follow: false } };

// Opened by the host's phone camera from the attendee's QR code. Checking in
// is idempotent (a second scan reports "already checked in"), so doing it on
// page load is safe and keeps the door moving.
export default async function CheckInPage({ params }: PageProps<"/check-in/[token]">) {
  const { token } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?as=organizer&next=${encodeURIComponent(`/check-in/${token}`)}`);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("host_check_in", { p_token: token, p_event_id: null });

  let tone = "bg-red-50 text-red-800";
  let heading = "Can't check in";
  let detail = "";
  let eventId: string | undefined;

  if (error) {
    detail = error.message === "FORBIDDEN" ? "This QR is a ticket. Show it to the event host to check in." : friendlyError(error.message);
  } else {
    const r = data as CheckInResult;
    eventId = r.event_id;
    switch (r.result) {
      case "CHECKED_IN":
        tone = "bg-green-50 text-green-900";
        heading = `✓ ${r.name ?? "Guest"} is in`;
        detail = r.ticket_number ?? "";
        log.info({ action: "CHECKED_IN", status: "success", user_id: user.id, event_id: r.event_id });
        break;
      case "ALREADY_CHECKED_IN":
        tone = "bg-amber-50 text-amber-900";
        heading = `${r.name ?? "Guest"} is already checked in`;
        detail = "This ticket was scanned before.";
        break;
      case "NOT_CONFIRMED":
        heading = `${r.name ?? "Guest"} doesn't have a confirmed spot`;
        detail = r.status === "WAITLISTED" ? "They're on the waitlist." : "Their ticket isn't active.";
        break;
      case "WRONG_EVENT":
        heading = "Ticket is for a different event";
        detail = r.event_title ?? "";
        break;
      default:
        heading = "Ticket not found";
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-12 text-center">
      <div className={`rounded-2xl p-8 ${tone}`}>
        <p className="text-2xl font-bold">{heading}</p>
        {detail && <p className="mt-2">{detail}</p>}
      </div>
      {eventId && (
        <Link href={`/host/events/${eventId}`} className="mt-6 inline-block font-medium text-brand">
          Open guest list
        </Link>
      )}
      <p className="mt-4 text-sm text-muted">Scan the next QR with your camera.</p>
    </div>
  );
}

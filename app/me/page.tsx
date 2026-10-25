import Link from "next/link";
import { TicketList } from "@/components/ticket-list";
import { EmptyState } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";
import { listMyUpcomingTickets } from "@/lib/data/queries";

export default async function MyTickets() {
  const user = await getSessionUser();
  if (!user) return null; // the layout already redirected
  const upcoming = await listMyUpcomingTickets(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hi{user.name ? `, ${user.name}` : ""} 👋</h1>
      {!user.name && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Add your name so organisers know who&apos;s coming.{" "}
          <Link href="/me/profile" className="font-medium underline">
            Add name
          </Link>
        </p>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Upcoming</h2>
        {upcoming.length === 0 ? (
          <EmptyState>
            No upcoming tickets.{" "}
            <Link href="/discover/coimbatore" className="font-medium text-brand">
              Find something this week
            </Link>
          </EmptyState>
        ) : (
          <TicketList tickets={upcoming} />
        )}
      </section>
    </div>
  );
}

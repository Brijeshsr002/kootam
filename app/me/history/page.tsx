import { TicketList } from "@/components/ticket-list";
import { EmptyState } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";
import { listMyPastTickets } from "@/lib/data/queries";

export default async function HistoryPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const past = await listMyPastTickets(user.id);
  const attended = past.filter((t) => t.status === "CHECKED_IN").length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">History</h1>
      <p className="text-muted">
        {attended} {attended === 1 ? "event" : "events"} attended
      </p>
      {past.length === 0 ? <EmptyState>Nothing here yet.</EmptyState> : <TicketList tickets={past} />}
    </div>
  );
}

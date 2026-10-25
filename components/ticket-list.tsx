import Link from "next/link";
import { Badge } from "@/components/ui";
import { formatEventTime } from "@/lib/format";
import type { MyTicket } from "@/lib/data/queries";

const LABEL = {
  CONFIRMED: ["Going", "good"],
  CHECKED_IN: ["Attended", "good"],
  WAITLISTED: ["Waitlist", "warn"],
  PENDING_PAYMENT: ["Payment pending", "warn"],
  NO_SHOW: ["Missed", "bad"],
  CANCELLED: ["Cancelled", "neutral"],
} as const;

export function TicketList({ tickets }: { tickets: MyTicket[] }) {
  return (
    <ul className="space-y-3">
      {tickets.map((t) => {
        const [label, tone] = LABEL[t.status];
        const cancelledEvent = t.event.status === "CANCELLED";
        return (
          <li key={t.id}>
            <Link href={`/me/tickets/${t.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border p-4 hover:border-brand">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">{formatEventTime(t.event.starts_at)}</p>
                <p className="truncate font-semibold">{t.event.title}</p>
                <p className="text-sm text-muted">{t.event.community.name}</p>
              </div>
              <Badge tone={cancelledEvent ? "bad" : tone}>{cancelledEvent ? "Event cancelled" : label}</Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

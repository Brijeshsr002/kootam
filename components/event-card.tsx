import Link from "next/link";
import { Badge } from "@/components/ui";
import { formatEventTime } from "@/lib/format";
import { eventPath } from "@/lib/site";
import type { EventRow } from "@/lib/data/types";

export function EventCard({
  event,
  communitySlug,
  communityName,
  href,
}: {
  event: EventRow;
  communitySlug: string;
  communityName?: string;
  href?: string;
}) {
  return (
    <Link
      href={href ?? eventPath(communitySlug, event.slug)}
      className="block rounded-xl border border-border p-4 transition hover:border-brand hover:shadow-sm"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">{formatEventTime(event.starts_at)}</p>
      <h3 className="mt-1 text-lg font-semibold leading-snug">{event.title}</h3>
      {communityName && <p className="text-sm text-muted">{communityName}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
        {event.venue_name && <span>{event.venue_name}</span>}
        {event.status === "DRAFT" && <Badge tone="warn">Draft</Badge>}
        {event.status === "CANCELLED" && <Badge tone="bad">Cancelled</Badge>}
        {event.status === "COMPLETED" && <Badge>Completed</Badge>}
        {event.status === "PUBLISHED" && <Badge tone="good">Free</Badge>}
      </div>
    </Link>
  );
}

import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { requireHostCommunity } from "@/lib/data/host";
import { listEventsStartingSoon } from "@/lib/data/queries";
import { formatEventTime } from "@/lib/format";

export default async function HostCheckInPage() {
  const { community } = await requireHostCommunity();
  const soon = await listEventsStartingSoon(community.id, 36);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Check-in</h1>
      <ol className="list-decimal space-y-2 rounded-xl border border-border p-4 pl-9 text-sm">
        <li>Stay logged in to Kootam on your phone.</li>
        <li>Open your phone&apos;s camera and point it at the guest&apos;s QR ticket.</li>
        <li>Tap the link that pops up. Kootam checks them in and shows their name.</li>
        <li>No phone with them? Find their name in the guest list and tap Check in.</li>
      </ol>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Events in the next 36 hours</h2>
        {soon.length === 0 ? (
          <EmptyState>No events coming up soon.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {soon.map((e) => (
              <li key={e.id}>
                <Link href={`/host/events/${e.id}`} className="block rounded-xl border border-border p-4 hover:border-brand">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-sm text-muted">{formatEventTime(e.starts_at)} · open guest list</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

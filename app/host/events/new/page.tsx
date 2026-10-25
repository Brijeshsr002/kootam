import { EventForm } from "@/components/event-form";
import { createEvent } from "@/app/actions/host";
import { requireHostCommunity } from "@/lib/data/host";

export default async function NewEventPage() {
  const { community } = await requireHostCommunity();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New event</h1>
        <p className="text-muted">For {community.name}. Times are in IST.</p>
      </div>
      <EventForm action={createEvent} />
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputClass, primaryButton, secondaryButton } from "@/components/ui";
import { isoToIstLocal } from "@/lib/format";
import type { ActionState } from "@/lib/actions/state";
import type { EventRow } from "@/lib/data/types";

export function EventForm({
  action,
  event,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  event?: EventRow;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isNew = !event;

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <Field label="Event title">
        <input name="title" defaultValue={event?.title} className={inputClass} required maxLength={120} placeholder="Sunday 10K at Race Course" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts (IST)">
          <input type="datetime-local" name="starts_at" defaultValue={event ? isoToIstLocal(event.starts_at) : ""} className={inputClass} required />
        </Field>
        <Field label="Ends (IST)">
          <input type="datetime-local" name="ends_at" defaultValue={event ? isoToIstLocal(event.ends_at) : ""} className={inputClass} required />
        </Field>
      </div>
      <Field label="Venue">
        <input name="venue_name" defaultValue={event?.venue_name ?? ""} className={inputClass} maxLength={120} placeholder="Race Course, near the clock tower" />
      </Field>
      <Field label="Address (optional)">
        <input name="venue_address" defaultValue={event?.venue_address ?? ""} className={inputClass} maxLength={300} />
      </Field>
      <Field label="Google Maps link (optional)">
        <input name="maps_url" defaultValue={event?.maps_url ?? ""} className={inputClass} placeholder="https://maps.app.goo.gl/…" />
      </Field>
      <Field label="Details">
        <textarea
          name="description"
          defaultValue={event?.description ?? ""}
          className={`${inputClass} min-h-32`}
          maxLength={6000}
          placeholder="Route, pace groups, what to bring, where to park…"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Spots" hint="Leave empty for unlimited.">
          <input type="number" name="capacity" min={1} max={10000} defaultValue={event?.capacity ?? ""} className={inputClass} placeholder="40" />
        </Field>
        <Field label="Registration closes (optional)" hint="Default: when the event starts.">
          <input
            type="datetime-local"
            name="registration_closes_at"
            defaultValue={event?.registration_closes_at ? isoToIstLocal(event.registration_closes_at) : ""}
            className={inputClass}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="waitlist_enabled" defaultChecked={event?.waitlist_enabled ?? true} className="h-4 w-4" />
        Waitlist when full (people move up automatically if someone cancels)
      </label>
      <p className="text-xs text-muted">Free events for now. Paid tickets and no-show deposits are coming soon.</p>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        {isNew ? (
          <>
            <button name="intent" value="publish" disabled={pending} className={primaryButton}>
              {pending ? "Saving…" : "Publish event"}
            </button>
            <button name="intent" value="draft" disabled={pending} className={secondaryButton}>
              Save as draft
            </button>
          </>
        ) : (
          <button disabled={pending} className={primaryButton}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        )}
      </div>
    </form>
  );
}

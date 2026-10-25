"use client";

import { useActionState } from "react";
import { dangerButton, Field, FormMessage, inputClass } from "@/components/ui";
import type { ActionState } from "@/lib/actions/state";

export function CancelEventForm({ action }: { action: (prev: ActionState, formData: FormData) => Promise<ActionState> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Cancel this event? Everyone's spot is released.")) e.preventDefault();
      }}
      className="space-y-3"
    >
      <Field label="Reason (shown on the event page)">
        <input name="reason" className={inputClass} maxLength={500} placeholder="Heavy rain forecast. See you next Sunday!" />
      </Field>
      <FormMessage state={state} />
      <button disabled={pending} className={dangerButton}>
        {pending ? "Cancelling…" : "Cancel event"}
      </button>
    </form>
  );
}

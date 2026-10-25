"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputClass, primaryButton } from "@/components/ui";
import { updateProfile } from "@/app/actions/attendee";

export function ProfileForm({ name, next }: { name: string; next?: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <Field label="Your name" hint="Shown to organisers on the guest list.">
        <input name="name" defaultValue={name} className={inputClass} required minLength={2} maxLength={120} autoComplete="name" />
      </Field>
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage state={state} />
      <button disabled={pending} className={primaryButton}>
        {pending ? "Saving…" : next ? "Save and continue" : "Save"}
      </button>
    </form>
  );
}

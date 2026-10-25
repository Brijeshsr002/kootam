"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, inputClass, primaryButton } from "@/components/ui";
import { slugify } from "@/lib/format";
import type { ActionState } from "@/lib/actions/state";
import type { Category, City, Community } from "@/lib/data/types";

export function CommunityForm({
  action,
  cities,
  categories,
  community,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  cities: City[];
  categories: Category[];
  community?: Community;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [name, setName] = useState(community?.name ?? "");
  const [slug, setSlug] = useState(community?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(community));
  const shownSlug = slugTouched ? slug : slugify(name);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <Field label="Community name">
        <input name="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required maxLength={80} placeholder="CBE Run Club" />
      </Field>
      <Field label="Your link" hint={community ? "Your link can't change once created." : "Your public page. Share it in your group."}>
        <div className="flex items-center gap-1">
          <span className="text-muted">/c/</span>
          <input
            name="slug"
            value={shownSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            className={inputClass}
            disabled={Boolean(community)}
            required
            maxLength={60}
          />
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City">
          <select name="city_id" defaultValue={community?.city_id ?? cities[0]?.id} className={inputClass} required>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select name="category_id" defaultValue={community?.category_id ?? categories[0]?.id} className={inputClass} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Tagline" hint="One line, shown under your name.">
        <input name="tagline" defaultValue={community?.tagline ?? ""} className={inputClass} maxLength={140} placeholder="Sunday long runs at Race Course, all paces welcome" />
      </Field>
      <Field label="About">
        <textarea name="description" defaultValue={community?.description ?? ""} className={`${inputClass} min-h-28`} maxLength={4000} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Instagram handle (optional)">
          <input name="instagram_handle" defaultValue={community?.instagram_handle ?? ""} className={inputClass} placeholder="cberunclub" />
        </Field>
        <Field label="WhatsApp group link (optional)" hint="Shown to members who join.">
          <input name="whatsapp_group_url" defaultValue={community?.whatsapp_group_url ?? ""} className={inputClass} placeholder="https://chat.whatsapp.com/…" />
        </Field>
      </div>
      <Field label="Who can find it">
        <select name="visibility" defaultValue={community?.visibility ?? "PUBLIC"} className={inputClass}>
          <option value="PUBLIC">Public: listed on Kootam&apos;s city pages</option>
          <option value="UNLISTED">Unlisted: only people with the link</option>
        </select>
      </Field>
      <FormMessage state={state} />
      <button disabled={pending} className={primaryButton}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

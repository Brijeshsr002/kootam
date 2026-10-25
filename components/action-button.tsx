"use client";

import { useState, useTransition } from "react";
import type { ActionState } from "@/lib/actions/state";
import { FormMessage, primaryButton } from "@/components/ui";

/** A button that runs a bound server action and shows its result underneath. */
export function ActionButton({
  action,
  children,
  pendingLabel = "Please wait…",
  confirm,
  className = primaryButton,
}: {
  action: () => Promise<ActionState>;
  children: React.ReactNode;
  pendingLabel?: string;
  confirm?: string;
  className?: string;
}) {
  const [state, setState] = useState<ActionState>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        className={className}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          startTransition(async () => setState(await action()));
        }}
      >
        {pending ? pendingLabel : children}
      </button>
      <FormMessage state={state} />
    </div>
  );
}

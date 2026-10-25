// Small shared building blocks. Tailwind classes live here so screens stay consistent.

export const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-brand";
export const primaryButton =
  "inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 font-medium text-brand-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
export const secondaryButton =
  "inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 font-medium hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60";
export const dangerButton =
  "inline-flex items-center justify-center rounded-full border border-red-200 px-5 py-2.5 font-medium text-red-700 hover:bg-red-50 disabled:opacity-60";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm font-medium">
      <span>{label}</span>
      {children}
      {hint && <span className="block text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function FormMessage({ state }: { state?: { error?: string; ok?: string } }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state.ok) return <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{state.ok}</p>;
  return null;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad" | "brand"; children: React.ReactNode }) {
  const tones = {
    neutral: "bg-surface text-muted",
    good: "bg-green-50 text-green-800",
    warn: "bg-amber-50 text-amber-800",
    bad: "bg-red-50 text-red-700",
    brand: "bg-orange-50 text-orange-800",
  } as const;
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted">{children}</div>;
}

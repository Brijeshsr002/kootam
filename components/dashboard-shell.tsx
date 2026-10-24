import Link from "next/link";

export type NavItem = { href: string; label: string };

export function DashboardShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <nav className="-mx-4 mt-2 flex gap-1 overflow-x-auto border-b border-border px-4 text-sm">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className="whitespace-nowrap px-3 py-2 text-muted hover:text-foreground">
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="py-6">{children}</div>
    </div>
  );
}

export function ComingSoon({ phase, children }: { phase: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted">
      {children} <span className="font-medium">(Phase {phase})</span>
    </div>
  );
}

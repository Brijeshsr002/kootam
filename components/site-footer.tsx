import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-semibold text-foreground">Kootam</span> · Your people, every week.
        </p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/discover/coimbatore">Coimbatore</Link>
          <Link href="/discover/bengaluru">Bengaluru</Link>
          <Link href="/discover/chennai">Chennai</Link>
          <Link href="/start">Start a community</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}

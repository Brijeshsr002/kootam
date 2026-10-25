import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">We couldn&apos;t find that</h1>
      <p className="text-muted">The link may be wrong, or the community may have moved.</p>
      <Link href="/discover/coimbatore" className="rounded-full bg-brand px-5 py-3 font-medium text-brand-foreground">
        See what&apos;s on
      </Link>
    </section>
  );
}

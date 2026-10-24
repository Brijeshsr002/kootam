import Link from "next/link";

// Placeholder landing page. City discovery arrives in Phase 6.
export default function Home() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Run clubs. Pickleball. Treks.
        <br />
        <span className="text-brand">Your people, every week.</span>
      </h1>
      <p className="max-w-xl text-lg text-muted">
        Join local communities and grab your spot in one tap. Organisers stop chasing UPI screenshots: payments,
        waitlists and check-ins run themselves. Launching in Coimbatore, Bengaluru and Chennai.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/signup" className="rounded-full bg-brand px-5 py-3 font-medium text-brand-foreground">
          Find your people
        </Link>
        <Link href="/signup?as=organizer" className="rounded-full border border-border px-5 py-3 font-medium">
          I run a community
        </Link>
      </div>
    </section>
  );
}

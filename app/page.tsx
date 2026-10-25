import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { getCities, isSupabaseConfigured, listDiscoverEvents, type DiscoverEvent } from "@/lib/data/queries";
import { SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

const FAQ = [
  {
    q: "What is Kootam?",
    a: "Kootam is where local run clubs, pickleball groups, gym bootcamps, cycling groups and trek clubs post their events. You join in one tap, get a QR ticket and show it at the venue.",
  },
  {
    q: "Is it free to join events?",
    a: "Yes. Free events are free on Kootam, with no fees. Paid tickets will show the full price before you pay.",
  },
  {
    q: "I run a group on WhatsApp. Why use Kootam?",
    a: "One link replaces the Google Form, the headcount messages and the 'anyone dropping?' chaos. You get a live guest list, an automatic waitlist when you're full, and QR check-in at the venue.",
  },
  {
    q: "Which cities is Kootam in?",
    a: "Coimbatore first, then Bengaluru and Chennai.",
  },
];

export default async function Home() {
  let events: DiscoverEvent[] = [];
  let citySlugs: { name: string; slug: string }[] = [];
  if (isSupabaseConfigured()) {
    try {
      const cities = await getCities();
      citySlugs = cities;
      const cbe = cities.find((c) => c.slug === "coimbatore");
      events = await listDiscoverEvents({ cityId: cbe?.id, limit: 6 });
    } catch {
      events = []; // the landing page must render even if the database is down
    }
  }

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <div className="flex flex-1 flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Coimbatore · Bengaluru · Chennai</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Run clubs. Pickleball. Bootcamps. Treks.
          <br />
          <span className="text-brand">Your people, every week.</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Find local sports and fitness communities and grab your spot in one tap. Organisers: one link replaces the Google Form, the
          headcount messages and the waitlist chaos.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/discover/coimbatore" className="rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground">
            See what&apos;s on
          </Link>
          <Link href="/start" className="rounded-full border border-border px-6 py-3 font-medium">
            I run a community
          </Link>
        </div>
      </section>

      {events.length > 0 && (
        <section className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-12">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-semibold">Coming up in Coimbatore</h2>
            <Link href="/discover/coimbatore" className="text-sm font-medium text-brand">
              See all →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} event={e} communitySlug={e.community.slug} communityName={e.community.name} />
            ))}
          </div>
        </section>
      )}

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-12 sm:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">For members</h2>
            <ol className="list-decimal space-y-1 pl-5 text-muted">
              <li>Open the event link from your group</li>
              <li>Tap &ldquo;Count me in&rdquo; to get your QR ticket</li>
              <li>Full? You&apos;re on the waitlist and move up automatically</li>
              <li>Show your QR at the venue</li>
            </ol>
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">For organisers</h2>
            <ol className="list-decimal space-y-1 pl-5 text-muted">
              <li>Create your community page in 2 minutes</li>
              <li>Post an event with a spot limit</li>
              <li>Share one link in your WhatsApp group</li>
              <li>Scan QR codes at the venue and see who really came</li>
            </ol>
            <Link href="/start" className="inline-block font-medium text-brand">
              Start your community, free →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl space-y-4 px-4 py-12">
        <h2 className="text-2xl font-semibold">Questions</h2>
        {FAQ.map((f) => (
          <details key={f.q} className="rounded-xl border border-border p-4">
            <summary className="cursor-pointer font-medium">{f.q}</summary>
            <p className="mt-2 text-muted">{f.a}</p>
          </details>
        ))}
        {citySlugs.length > 0 && (
          <p className="pt-4 text-sm text-muted">
            Browse:{" "}
            {citySlugs.map((c, i) => (
              <span key={c.slug}>
                {i > 0 && " · "}
                <Link href={`/discover/${c.slug}`} className="underline">
                  Sports and fitness events in {c.name}
                </Link>
              </span>
            ))}
          </p>
        )}
      </section>
    </div>
  );
}
